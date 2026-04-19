
-- ============================================================
-- PART 1: Schema enhancements for workflow routing + access control
-- ============================================================

-- Add routing snapshot columns to workflow_instances
ALTER TABLE public.workflow_instances
  ADD COLUMN IF NOT EXISTS current_approver_position_id uuid REFERENCES public.positions(id),
  ADD COLUMN IF NOT EXISTS routing_mode text DEFAULT 'role',
  ADD COLUMN IF NOT EXISTS fallback_used boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS routing_snapshot jsonb DEFAULT '{}';

-- ============================================================
-- PART 2: Enhanced helper RPCs
-- ============================================================

-- get_my_position_id (wrapper around resolve_my_position_id for cleaner naming)
CREATE OR REPLACE FUNCTION public.get_my_position_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.position_id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
    AND e.status = 'active'
    AND e.company_id = get_my_company_id()
    AND e.position_id IS NOT NULL
  LIMIT 1
$$;

-- get_managed_position_ids: positions under current user's position in org tree
CREATE OR REPLACE FUNCTION public.get_managed_position_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE subtree AS (
    SELECT id FROM public.positions
    WHERE parent_position_id = get_my_position_id()
      AND company_id = get_my_company_id()
    UNION ALL
    SELECT p.id FROM public.positions p
    JOIN subtree s ON p.parent_position_id = s.id
    WHERE p.company_id = get_my_company_id()
  )
  SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM subtree
$$;

-- can_access_employee: checks if current user can see an employee
CREATE OR REPLACE FUNCTION public.can_access_employee(p_employee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cid uuid := get_my_company_id();
  v_emp_cid uuid;
BEGIN
  SELECT company_id INTO v_emp_cid FROM employees WHERE id = p_employee_id;
  IF v_emp_cid IS NULL OR v_emp_cid != v_cid THEN RETURN false; END IF;

  -- Self
  IF EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id AND user_id = v_uid) THEN RETURN true; END IF;

  -- Admin / tenant_admin / hr_manager / hr_officer → full company
  IF has_role(v_uid, 'admin') OR has_role(v_uid, 'tenant_admin')
     OR has_role(v_uid, 'hr_manager') OR has_role(v_uid, 'hr_officer') THEN
    RETURN true;
  END IF;

  -- Manager → direct reports
  IF EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id AND manager_user_id = v_uid) THEN
    RETURN true;
  END IF;

  -- Position-based management (org chart subtree)
  IF EXISTS (
    SELECT 1 FROM employees WHERE id = p_employee_id
    AND position_id = ANY(get_managed_position_ids())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Resolve position approver with full fallback chain
CREATE OR REPLACE FUNCTION public.resolve_position_approver_full(
  p_position_id uuid,
  p_company_id uuid,
  p_fallback_mode text DEFAULT 'parent_position'
)
RETURNS TABLE(user_id uuid, user_name text, position_title text, fallback_applied boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid;
  v_name text;
  v_title text;
  v_parent_pos_id uuid;
BEGIN
  -- Try direct position assignment
  SELECT e.user_id, COALESCE(e.name_ar, e.name_en, pr.full_name), COALESCE(p.title_ar, p.title_en)
  INTO v_uid, v_name, v_title
  FROM employees e
  JOIN positions p ON p.id = e.position_id
  LEFT JOIN profiles pr ON pr.user_id = e.user_id
  WHERE e.position_id = p_position_id
    AND e.company_id = p_company_id
    AND e.status = 'active'
  LIMIT 1;

  IF v_uid IS NOT NULL THEN
    RETURN QUERY SELECT v_uid, v_name, v_title, false;
    RETURN;
  END IF;

  -- Position vacant — apply fallback
  CASE p_fallback_mode
    WHEN 'parent_position' THEN
      SELECT p.parent_position_id INTO v_parent_pos_id FROM positions p WHERE p.id = p_position_id;
      IF v_parent_pos_id IS NOT NULL THEN
        RETURN QUERY SELECT * FROM resolve_position_approver_full(v_parent_pos_id, p_company_id, 'tenant_admin');
        RETURN;
      END IF;
    WHEN 'hr_manager' THEN
      SELECT ur.user_id, COALESCE(pr.full_name, 'HR Manager'), 'مدير HR'
      INTO v_uid, v_name, v_title
      FROM user_roles ur
      LEFT JOIN profiles pr ON pr.user_id = ur.user_id
      WHERE ur.role = 'hr_manager' AND ur.tenant_id = p_company_id
      LIMIT 1;
      IF v_uid IS NOT NULL THEN
        RETURN QUERY SELECT v_uid, v_name, v_title, true;
        RETURN;
      END IF;
    WHEN 'tenant_admin' THEN
      SELECT ur.user_id, COALESCE(pr.full_name, 'Tenant Admin'), 'مدير المنشأة'
      INTO v_uid, v_name, v_title
      FROM user_roles ur
      LEFT JOIN profiles pr ON pr.user_id = ur.user_id
      WHERE ur.role IN ('admin', 'tenant_admin') AND ur.tenant_id = p_company_id
      LIMIT 1;
      IF v_uid IS NOT NULL THEN
        RETURN QUERY SELECT v_uid, v_name, v_title, true;
        RETURN;
      END IF;
    ELSE NULL;
  END CASE;

  -- Ultimate fallback: any admin
  SELECT ur.user_id, COALESCE(pr.full_name, 'Admin'), 'مدير'
  INTO v_uid, v_name, v_title
  FROM user_roles ur
  LEFT JOIN profiles pr ON pr.user_id = ur.user_id
  WHERE ur.role IN ('admin', 'tenant_admin') AND ur.tenant_id = p_company_id
  LIMIT 1;

  IF v_uid IS NOT NULL THEN
    RETURN QUERY SELECT v_uid, v_name, v_title, true;
  END IF;
END;
$$;

-- ============================================================
-- PART 3: Updated process_approval_action with position routing
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_approval_action(
  p_instance_id uuid,
  p_action text,
  p_comments text DEFAULT NULL,
  p_signature_data text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_instance workflow_instances%ROWTYPE;
  v_actor_id uuid := auth.uid();
  v_from_status text;
  v_to_status text;
  v_step_order int;
  v_template_id uuid;
  v_total_steps int;
  v_next_step int;
  v_company_id uuid;
  v_actor_company_id uuid;
  v_generated_doc_id uuid;
  v_current_step RECORD;
  v_next_step_record RECORD;
  v_resolved_approver RECORD;
  v_routing_mode text;
BEGIN
  SELECT * INTO v_instance FROM workflow_instances WHERE id = p_instance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workflow instance not found'; END IF;

  v_company_id := v_instance.company_id;
  v_from_status := v_instance.status;
  v_step_order := v_instance.current_step_order;
  v_template_id := v_instance.template_id;

  -- Tenant isolation
  SELECT company_id INTO v_actor_company_id FROM profiles WHERE user_id = v_actor_id;
  IF v_actor_company_id IS NULL OR v_actor_company_id != v_company_id THEN
    RAISE EXCEPTION 'Cross-tenant action not allowed';
  END IF;

  -- Self-approval prevention
  IF v_instance.requester_user_id = v_actor_id AND p_action IN ('approve', 'reject', 'escalate', 'lock') THEN
    RAISE EXCEPTION 'Cannot approve or reject your own request';
  END IF;

  -- Get current step info
  IF v_template_id IS NOT NULL THEN
    SELECT * INTO v_current_step FROM workflow_steps
    WHERE template_id = v_template_id AND step_order = v_step_order;
  END IF;

  v_routing_mode := COALESCE(v_current_step.routing_mode, 'role');

  -- Authorization check: position-based OR role-based
  IF p_action IN ('approve', 'reject', 'escalate', 'lock', 'return') THEN
    DECLARE
      v_authorized boolean := false;
    BEGIN
      -- Position-based check
      IF v_routing_mode = 'position' AND v_current_step.approver_position_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM employees
          WHERE user_id = v_actor_id AND position_id = v_current_step.approver_position_id
            AND company_id = v_company_id AND status = 'active'
        ) INTO v_authorized;

        -- Check if actor is fallback approver
        IF NOT v_authorized THEN
          SELECT EXISTS (
            SELECT 1 FROM resolve_position_approver_full(
              v_current_step.approver_position_id, v_company_id,
              COALESCE(v_current_step.fallback_mode, 'parent_position')
            ) r WHERE r.user_id = v_actor_id
          ) INTO v_authorized;
        END IF;
      END IF;

      -- Role-based check (fallback or explicit role routing)
      IF NOT v_authorized THEN
        IF has_role(v_actor_id, 'admin') OR has_role(v_actor_id, 'tenant_admin')
           OR has_role(v_actor_id, 'hr_manager') OR has_role(v_actor_id, 'hr_officer')
           OR has_role(v_actor_id, 'manager')
           OR (has_role(v_actor_id, 'finance_manager') AND v_instance.request_type IN ('payroll', 'salary_change', 'final_settlement'))
        THEN
          v_authorized := true;
        END IF;
      END IF;

      IF NOT v_authorized THEN
        RAISE EXCEPTION 'Insufficient privileges to perform this action';
      END IF;
    END;
  END IF;

  -- Manager scope check for non-admin managers
  IF has_role(v_actor_id, 'manager')
     AND NOT has_role(v_actor_id, 'admin')
     AND NOT has_role(v_actor_id, 'hr_manager')
     AND p_action IN ('approve', 'reject', 'return')
     AND v_routing_mode = 'role' THEN
    DECLARE
      v_ref_employee_id uuid;
      v_is_accessible boolean := false;
    BEGIN
      CASE v_instance.request_type
        WHEN 'leave' THEN
          SELECT employee_id INTO v_ref_employee_id FROM leave_requests WHERE id = v_instance.reference_id::uuid;
        WHEN 'attendance_correction' THEN
          SELECT employee_id INTO v_ref_employee_id FROM attendance_corrections WHERE id = v_instance.reference_id::uuid;
        WHEN 'contract' THEN
          SELECT employee_id INTO v_ref_employee_id FROM contracts WHERE id = v_instance.reference_id::uuid;
        WHEN 'final_settlement' THEN
          SELECT employee_id INTO v_ref_employee_id FROM exit_clearance WHERE id = v_instance.reference_id::uuid;
        WHEN 'onboarding' THEN
          SELECT employee_id INTO v_ref_employee_id FROM onboarding_tasks WHERE id = v_instance.reference_id::uuid;
        WHEN 'document' THEN
          SELECT employee_id INTO v_ref_employee_id FROM documents WHERE id = v_instance.reference_id::uuid;
        ELSE v_ref_employee_id := NULL;
      END CASE;
      IF v_ref_employee_id IS NOT NULL THEN
        SELECT (e.manager_user_id = v_actor_id OR e.position_id = ANY(get_managed_position_ids()))
        INTO v_is_accessible
        FROM employees e WHERE e.id = v_ref_employee_id;
        IF NOT COALESCE(v_is_accessible, false) THEN
          RAISE EXCEPTION 'You can only approve requests for your direct reports';
        END IF;
      END IF;
    END;
  END IF;

  -- Determine target status
  CASE p_action
    WHEN 'submit' THEN v_to_status := 'submitted';
    WHEN 'approve' THEN
      IF v_template_id IS NOT NULL THEN
        SELECT count(*) INTO v_total_steps FROM workflow_steps WHERE template_id = v_template_id;
        IF v_step_order < v_total_steps THEN
          v_to_status := 'pending_approval';
          v_next_step := v_step_order + 1;

          -- Check if next step should be skipped (vacant optional position)
          SELECT * INTO v_next_step_record FROM workflow_steps
          WHERE template_id = v_template_id AND step_order = v_next_step;

          IF v_next_step_record.routing_mode = 'position'
             AND v_next_step_record.skip_if_position_vacant = true
             AND v_next_step_record.approver_position_id IS NOT NULL THEN
            IF NOT EXISTS (
              SELECT 1 FROM employees
              WHERE position_id = v_next_step_record.approver_position_id
                AND company_id = v_company_id AND status = 'active'
            ) THEN
              -- Skip this step
              IF v_next_step < v_total_steps THEN
                v_next_step := v_next_step + 1;
              ELSE
                v_to_status := 'approved';
                v_next_step := NULL;
              END IF;
            END IF;
          END IF;
        ELSE
          v_to_status := 'approved';
        END IF;
      ELSE
        v_to_status := 'approved';
      END IF;
    WHEN 'reject' THEN v_to_status := 'rejected';
    WHEN 'return' THEN v_to_status := 'returned';
    WHEN 'escalate' THEN v_to_status := v_from_status;
    WHEN 'lock' THEN v_to_status := 'locked';
    WHEN 'archive' THEN v_to_status := 'archived';
    ELSE RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  -- Record action
  INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, comments, signature_data)
  VALUES (p_instance_id, v_company_id, v_actor_id, p_action, v_from_status, v_to_status, v_step_order, p_comments, p_signature_data);

  -- Resolve next approver snapshot for routing
  DECLARE
    v_snapshot jsonb := '{}';
    v_next_approver_uid uuid;
    v_next_approver_pos_id uuid;
    v_fallback_applied boolean := false;
  BEGIN
    IF v_next_step IS NOT NULL AND v_template_id IS NOT NULL THEN
      IF v_next_step_record.id IS NULL THEN
        SELECT * INTO v_next_step_record FROM workflow_steps
        WHERE template_id = v_template_id AND step_order = v_next_step;
      END IF;

      IF v_next_step_record.routing_mode = 'position' AND v_next_step_record.approver_position_id IS NOT NULL THEN
        SELECT r.user_id, r.fallback_applied
        INTO v_next_approver_uid, v_fallback_applied
        FROM resolve_position_approver_full(
          v_next_step_record.approver_position_id, v_company_id,
          COALESCE(v_next_step_record.fallback_mode, 'parent_position')
        ) r LIMIT 1;
        v_next_approver_pos_id := v_next_step_record.approver_position_id;
      END IF;

      v_snapshot := jsonb_build_object(
        'step', v_next_step,
        'routing_mode', COALESCE(v_next_step_record.routing_mode, 'role'),
        'approver_role', v_next_step_record.approver_role,
        'approver_position_id', v_next_approver_pos_id,
        'resolved_user_id', v_next_approver_uid,
        'fallback_applied', v_fallback_applied
      );
    END IF;

    UPDATE workflow_instances SET
      status = v_to_status,
      current_step_order = COALESCE(v_next_step, current_step_order),
      current_approver_id = COALESCE(v_next_approver_uid, current_approver_id),
      current_approver_position_id = v_next_approver_pos_id,
      routing_mode = COALESCE(v_next_step_record.routing_mode, routing_mode, 'role'),
      fallback_used = v_fallback_applied,
      routing_snapshot = v_snapshot,
      is_escalated = CASE WHEN p_action = 'escalate' THEN true ELSE is_escalated END,
      approved_at = CASE WHEN v_to_status = 'approved' THEN now() ELSE approved_at END,
      rejected_at = CASE WHEN v_to_status = 'rejected' THEN now() ELSE rejected_at END,
      final_comments = COALESCE(p_comments, final_comments),
      updated_at = now()
    WHERE id = p_instance_id;
  END;

  -- Digital signature
  IF p_signature_data IS NOT NULL THEN
    INSERT INTO digital_signatures (company_id, user_id, document_id, document_type, signature_data, signature_type)
    VALUES (v_company_id, v_actor_id, p_instance_id, 'approval', p_signature_data, 'drawn');
  END IF;

  -- Sync terminal status to source tables
  IF v_to_status IN ('approved', 'rejected', 'returned', 'locked') THEN
    IF v_instance.request_type = 'leave' THEN
      UPDATE leave_requests SET status =
        CASE v_to_status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'returned' THEN 'pending' ELSE status END,
        reviewed_by = v_actor_id, updated_at = now()
      WHERE id = v_instance.reference_id::uuid;
    END IF;
    IF v_instance.request_type = 'attendance_correction' THEN
      UPDATE attendance_corrections SET status =
        CASE v_to_status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'returned' THEN 'pending' ELSE status END,
        reviewed_by = v_actor_id, updated_at = now()
      WHERE id = v_instance.reference_id::uuid;
    END IF;
    IF v_instance.request_type = 'payroll' THEN
      UPDATE payroll_runs SET status =
        CASE v_to_status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'draft' WHEN 'returned' THEN 'draft' WHEN 'locked' THEN 'paid' ELSE status END,
        approved_by = CASE WHEN v_to_status = 'approved' THEN v_actor_id ELSE approved_by END
      WHERE id = v_instance.reference_id::uuid;
    END IF;
    IF v_instance.request_type = 'contract' THEN
      UPDATE contracts SET status =
        CASE v_to_status WHEN 'approved' THEN 'active' WHEN 'rejected' THEN 'terminated' WHEN 'returned' THEN 'active' ELSE status END,
        updated_at = now()
      WHERE id = v_instance.reference_id::uuid;
    END IF;
    IF v_instance.request_type = 'final_settlement' THEN
      UPDATE exit_clearance SET status =
        CASE v_to_status WHEN 'approved' THEN 'completed' WHEN 'rejected' THEN 'cancelled' WHEN 'returned' THEN 'pending' ELSE status END,
        updated_at = now()
      WHERE id = v_instance.reference_id::uuid;
    END IF;
    IF v_instance.request_type = 'onboarding' THEN
      UPDATE onboarding_tasks SET
        status = CASE v_to_status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'returned' THEN 'pending' ELSE status END,
        is_completed = CASE WHEN v_to_status = 'approved' THEN true ELSE is_completed END,
        completed_at = CASE WHEN v_to_status = 'approved' THEN now() ELSE completed_at END
      WHERE id = v_instance.reference_id::uuid;
    END IF;
    IF v_instance.request_type = 'document' THEN
      UPDATE documents SET
        status = CASE v_to_status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'returned' THEN 'pending' ELSE status END,
        approved_by = CASE WHEN v_to_status = 'approved' THEN v_actor_id ELSE approved_by END,
        approved_at = CASE WHEN v_to_status = 'approved' THEN now() ELSE approved_at END,
        rejected_at = CASE WHEN v_to_status = 'rejected' THEN now() ELSE rejected_at END,
        returned_at = CASE WHEN v_to_status = 'returned' THEN now() ELSE returned_at END
      WHERE id = v_instance.reference_id::uuid;
    END IF;
    IF v_instance.request_type LIKE 'certificate%' OR v_instance.request_type = 'salary_change' THEN
      UPDATE approval_requests SET status =
        CASE v_to_status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'returned' THEN 'pending' ELSE status END,
        approved_by = CASE WHEN v_to_status = 'approved' THEN v_actor_id ELSE approved_by END,
        updated_at = now()
      WHERE id = v_instance.reference_id::uuid;
    END IF;
  END IF;

  -- Auto-generate document on final approval
  IF v_to_status = 'approved' THEN
    BEGIN
      v_generated_doc_id := auto_generate_document_on_approval(p_instance_id);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO audit_logs (company_id, user_id, table_name, action, record_id, new_values)
      VALUES (v_company_id, v_actor_id, 'generated_documents', 'auto_generate_failed', p_instance_id,
        jsonb_build_object('error', SQLERRM));
    END;
  END IF;

  -- Send notifications to next approver
  IF v_next_step IS NOT NULL AND v_template_id IS NOT NULL THEN
    IF v_next_step_record.id IS NULL THEN
      SELECT * INTO v_next_step_record FROM workflow_steps WHERE template_id = v_template_id AND step_order = v_next_step;
    END IF;

    IF FOUND THEN
      IF v_next_step_record.routing_mode = 'position' AND v_next_step_record.approver_position_id IS NOT NULL THEN
        -- Notify resolved position approver
        INSERT INTO notifications (company_id, user_id, title, message, type, link)
        SELECT v_company_id, r.user_id, 'طلب موافقة - المرحلة ' || v_next_step, v_instance.request_type, 'info', '/approvals'
        FROM resolve_position_approver_full(v_next_step_record.approver_position_id, v_company_id,
          COALESCE(v_next_step_record.fallback_mode, 'parent_position')) r
        WHERE r.user_id IS NOT NULL
        LIMIT 1;
      ELSIF v_next_step_record.approver_role IS NOT NULL THEN
        INSERT INTO notifications (company_id, user_id, title, message, type, link)
        SELECT v_company_id, ur.user_id, 'طلب موافقة - المرحلة ' || v_next_step, v_instance.request_type, 'info', '/approvals'
        FROM user_roles ur
        WHERE ur.role::text = v_next_step_record.approver_role AND ur.tenant_id = v_company_id
        LIMIT 5;
      END IF;
    END IF;
  END IF;

  -- Notify requester on terminal states
  IF v_to_status IN ('approved', 'rejected', 'returned') AND v_instance.requester_user_id IS NOT NULL THEN
    INSERT INTO notifications (company_id, user_id, title, message, type, link)
    VALUES (
      v_company_id, v_instance.requester_user_id,
      CASE v_to_status
        WHEN 'approved' THEN 'تمت الموافقة على طلبك'
        WHEN 'rejected' THEN 'تم رفض طلبك'
        WHEN 'returned' THEN 'تم إرجاع طلبك للتعديل'
      END,
      COALESCE(p_comments, 'تم تحديث حالة طلبك'), 'approval', '/approvals'
    );
  END IF;

  -- Audit log
  INSERT INTO audit_logs (company_id, user_id, table_name, action, record_id, new_values)
  VALUES (v_company_id, v_actor_id, 'workflow_instances', 'approval_' || p_action, p_instance_id,
    jsonb_build_object('action', p_action, 'from_status', v_from_status, 'to_status', v_to_status,
    'step_order', v_step_order, 'request_type', v_instance.request_type,
    'generated_doc_id', v_generated_doc_id));

  RETURN json_build_object('success', true, 'action', p_action, 'from_status', v_from_status,
    'to_status', v_to_status, 'generated_doc_id', v_generated_doc_id);
END;
$$;

-- ============================================================
-- PART 4: Performance indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_user_id ON public.employees(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_status ON public.employees(company_id, status);
CREATE INDEX IF NOT EXISTS idx_positions_parent ON public.positions(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_positions_company ON public.positions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_department ON public.positions(department_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_company_status ON public.workflow_instances(company_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_requester ON public.workflow_instances(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_approver ON public.workflow_instances(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_instance ON public.approval_actions(instance_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_company ON public.generated_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_employee ON public.generated_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON public.attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON public.payroll_runs(company_id);
