
-- Fix: allow approver_role to be nullable since manager_chain routing doesn't use it
ALTER TABLE workflow_steps ALTER COLUMN approver_role DROP NOT NULL;
ALTER TABLE workflow_steps ALTER COLUMN approver_role SET DEFAULT NULL;

-- Fix leave template steps
DELETE FROM workflow_steps WHERE template_id = '0d7d2ddf-a6a8-412f-bd63-b962a555e2d7';

INSERT INTO workflow_steps (template_id, step_order, name, routing_mode, approver_role, sla_hours, fallback_mode, skip_if_position_vacant)
VALUES
  ('0d7d2ddf-a6a8-412f-bd63-b962a555e2d7', 1, 'المدير المباشر', 'manager_chain', NULL, 24, 'hr_manager', true),
  ('0d7d2ddf-a6a8-412f-bd63-b962a555e2d7', 2, 'مدير الموارد البشرية', 'role', 'hr_manager', 48, 'tenant_admin', false);

-- Fix all leave templates globally: first step should be manager_chain
UPDATE workflow_steps ws
SET routing_mode = 'manager_chain', approver_role = NULL, fallback_mode = 'hr_manager', skip_if_position_vacant = true
FROM workflow_templates wt
WHERE ws.template_id = wt.id
  AND wt.request_type = 'leave'
  AND wt.is_active = true
  AND ws.step_order = 1
  AND ws.routing_mode != 'manager_chain';

-- =====================================================
-- Rewrite create_workflow_instance
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_workflow_instance(
  p_request_type text,
  p_reference_id uuid,
  p_company_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_template_id uuid;
  v_first_step record;
  v_instance_id uuid;
  v_requester_position_id uuid;
  v_resolved_uid uuid;
  v_resolved_pos uuid;
  v_resolved_name text;
  v_fallback boolean := false;
  v_routing_mode text;
  v_routing_snapshot jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_company_id := COALESCE(p_company_id, get_my_company_id());
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'No company context'; END IF;

  -- Template resolution: exact -> prefix -> general
  SELECT id INTO v_template_id FROM workflow_templates
    WHERE company_id = v_company_id AND request_type = p_request_type AND is_active = true LIMIT 1;
  IF v_template_id IS NULL AND position('_' in p_request_type) > 0 THEN
    SELECT id INTO v_template_id FROM workflow_templates
      WHERE company_id = v_company_id AND request_type = split_part(p_request_type, '_', 1) AND is_active = true LIMIT 1;
  END IF;
  IF v_template_id IS NULL THEN
    SELECT id INTO v_template_id FROM workflow_templates
      WHERE company_id = v_company_id AND request_type = 'general' AND is_active = true LIMIT 1;
  END IF;

  -- Get first step
  IF v_template_id IS NOT NULL THEN
    SELECT * INTO v_first_step FROM workflow_steps WHERE template_id = v_template_id ORDER BY step_order LIMIT 1;
  END IF;

  -- Get requester position
  SELECT e.position_id INTO v_requester_position_id
  FROM employees e WHERE e.user_id = v_user_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;

  v_routing_mode := COALESCE(v_first_step.routing_mode, 'manager_chain');

  -- === APPROVER RESOLUTION ===

  -- A. Explicit position
  IF v_first_step IS NOT NULL AND v_first_step.routing_mode = 'position' AND v_first_step.approver_position_id IS NOT NULL THEN
    SELECT e.user_id, e.name_ar INTO v_resolved_uid, v_resolved_name
    FROM employees e WHERE e.position_id = v_first_step.approver_position_id
      AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
    v_resolved_pos := v_first_step.approver_position_id;
    IF v_resolved_uid IS NULL THEN
      SELECT r.approver_user_id, r.approver_position_id, r.approver_name
      INTO v_resolved_uid, v_resolved_pos, v_resolved_name
      FROM resolve_hierarchy_approver(v_first_step.approver_position_id, v_company_id) r LIMIT 1;
      v_fallback := true;
    END IF;

  -- B. Role-based
  ELSIF v_first_step IS NOT NULL AND v_first_step.routing_mode = 'role' AND v_first_step.approver_role IS NOT NULL THEN
    IF v_first_step.approver_role = 'manager' AND v_requester_position_id IS NOT NULL THEN
      SELECT r.approver_user_id, r.approver_position_id, r.approver_name
      INTO v_resolved_uid, v_resolved_pos, v_resolved_name
      FROM resolve_hierarchy_approver(v_requester_position_id, v_company_id) r LIMIT 1;
    ELSE
      SELECT ur.user_id INTO v_resolved_uid
      FROM user_roles ur WHERE ur.role::text = v_first_step.approver_role AND ur.tenant_id = v_company_id LIMIT 1;
      IF v_resolved_uid IS NOT NULL THEN
        SELECT e.name_ar, e.position_id INTO v_resolved_name, v_resolved_pos
        FROM employees e WHERE e.user_id = v_resolved_uid AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
      END IF;
    END IF;
    IF v_resolved_uid IS NULL AND v_requester_position_id IS NOT NULL THEN
      SELECT r.approver_user_id, r.approver_position_id, r.approver_name
      INTO v_resolved_uid, v_resolved_pos, v_resolved_name
      FROM resolve_hierarchy_approver(v_requester_position_id, v_company_id) r LIMIT 1;
      v_fallback := true;
    END IF;

  -- C. Manager chain (default)
  ELSIF v_requester_position_id IS NOT NULL THEN
    v_routing_mode := 'manager_chain';
    SELECT r.approver_user_id, r.approver_position_id, r.approver_name
    INTO v_resolved_uid, v_resolved_pos, v_resolved_name
    FROM resolve_hierarchy_approver(v_requester_position_id, v_company_id) r LIMIT 1;
  END IF;

  -- D. HR fallback
  IF v_resolved_uid IS NULL THEN
    SELECT ur.user_id INTO v_resolved_uid
    FROM user_roles ur WHERE ur.role = 'hr_manager' AND ur.tenant_id = v_company_id LIMIT 1;
    IF v_resolved_uid IS NOT NULL THEN
      SELECT e.name_ar, e.position_id INTO v_resolved_name, v_resolved_pos
      FROM employees e WHERE e.user_id = v_resolved_uid AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
      v_fallback := true;
      v_routing_mode := 'hr_owner';
    END IF;
  END IF;

  -- E. Tenant admin fallback
  IF v_resolved_uid IS NULL THEN
    SELECT ur.user_id INTO v_resolved_uid
    FROM user_roles ur WHERE ur.role = 'tenant_admin' AND ur.tenant_id = v_company_id LIMIT 1;
    IF v_resolved_uid IS NOT NULL THEN
      SELECT e.name_ar, e.position_id INTO v_resolved_name, v_resolved_pos
      FROM employees e WHERE e.user_id = v_resolved_uid AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
      v_fallback := true;
      v_routing_mode := 'tenant_admin';
    END IF;
  END IF;

  -- Prevent self-approval
  IF v_resolved_uid = v_user_id THEN
    DECLARE v_next_uid uuid; v_next_pos uuid; v_next_name text;
    BEGIN
      IF v_resolved_pos IS NOT NULL THEN
        SELECT r.approver_user_id, r.approver_position_id, r.approver_name
        INTO v_next_uid, v_next_pos, v_next_name
        FROM resolve_hierarchy_approver(v_resolved_pos, v_company_id) r LIMIT 1;
        IF v_next_uid IS NOT NULL AND v_next_uid != v_user_id THEN
          v_resolved_uid := v_next_uid;
          v_resolved_pos := v_next_pos;
          v_resolved_name := v_next_name;
          v_fallback := true;
        END IF;
      END IF;
      IF v_resolved_uid = v_user_id OR v_resolved_uid IS NULL THEN
        SELECT ur.user_id INTO v_resolved_uid
        FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id AND ur.user_id != v_user_id LIMIT 1;
        IF v_resolved_uid IS NOT NULL THEN
          SELECT e.name_ar, e.position_id INTO v_resolved_name, v_resolved_pos
          FROM employees e WHERE e.user_id = v_resolved_uid AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
          v_fallback := true;
        END IF;
      END IF;
    END;
  END IF;

  -- Build snapshot
  v_routing_snapshot := jsonb_build_object(
    'requester_position_id', v_requester_position_id,
    'routing_mode', v_routing_mode,
    'resolved_user_id', v_resolved_uid,
    'approver_position_id', v_resolved_pos,
    'approver_name', v_resolved_name,
    'fallback_applied', v_fallback,
    'step', COALESCE(v_first_step.step_order, 1),
    'template_found', v_template_id IS NOT NULL
  );

  -- Create instance
  INSERT INTO workflow_instances (
    company_id, template_id, request_type, reference_id, requester_user_id,
    current_step_order, status, due_date,
    current_approver_id, current_approver_position_id,
    routing_mode, fallback_used, routing_snapshot
  ) VALUES (
    v_company_id, v_template_id, p_request_type, p_reference_id, v_user_id,
    COALESCE(v_first_step.step_order, 1),
    CASE WHEN v_resolved_uid IS NOT NULL THEN 'pending_approval' ELSE 'submitted' END,
    CASE WHEN v_first_step IS NOT NULL AND v_first_step.sla_hours IS NOT NULL
      THEN now() + (v_first_step.sla_hours || ' hours')::interval ELSE NULL END,
    v_resolved_uid, v_resolved_pos,
    v_routing_mode, v_fallback, v_routing_snapshot
  ) RETURNING id INTO v_instance_id;

  -- Record submit action
  INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order)
  VALUES (v_instance_id, v_company_id, v_user_id, 'submit', 'draft',
    CASE WHEN v_resolved_uid IS NOT NULL THEN 'pending_approval' ELSE 'submitted' END, 1);

  -- Notify approver
  IF v_resolved_uid IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (company_id, user_id, title, message, type, link)
      VALUES (v_company_id, v_resolved_uid, 'طلب موافقة جديد', p_request_type, 'info', '/approvals');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN v_instance_id;
END;
$$;

-- =====================================================
-- Rewrite get_my_visible_workflow_instances
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_visible_workflow_instances(
  p_status text DEFAULT NULL,
  p_request_type text DEFAULT NULL
)
RETURNS SETOF workflow_instances
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_is_admin boolean;
  v_is_hr boolean;
  v_is_manager boolean;
  v_is_finance boolean;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_company_id IS NULL THEN RETURN; END IF;

  v_is_admin := EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role IN ('admin', 'tenant_admin') AND tenant_id = v_company_id);
  v_is_hr := EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role IN ('hr_manager', 'hr_officer') AND tenant_id = v_company_id);
  v_is_manager := EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'manager' AND tenant_id = v_company_id);
  v_is_finance := EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'finance_manager' AND tenant_id = v_company_id);

  RETURN QUERY
  SELECT wi.*
  FROM workflow_instances wi
  WHERE wi.company_id = v_company_id
    AND (p_status IS NULL OR p_status = 'all' OR wi.status = p_status)
    AND (p_request_type IS NULL OR p_request_type = 'all' OR wi.request_type = p_request_type)
    AND (
      v_is_admin OR v_is_hr
      OR wi.requester_user_id = v_user_id
      OR wi.current_approver_id = v_user_id
      OR (v_is_finance AND wi.request_type IN ('payroll', 'salary_change', 'final_settlement', 'expense'))
      OR (v_is_manager AND wi.requester_user_id IN (
        SELECT e.user_id FROM employees e WHERE e.manager_user_id = v_user_id AND e.company_id = v_company_id
      ))
    )
  ORDER BY wi.created_at DESC;
END;
$$;

-- =====================================================
-- Repair function for stuck requests
-- =====================================================
CREATE OR REPLACE FUNCTION public.repair_stuck_workflow_instances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_repaired int := 0;
  v_created int := 0;
  v_rec record;
  v_instance_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_company_id := get_my_company_id();
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'No company context'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role IN ('admin', 'tenant_admin', 'hr_manager') AND tenant_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- A. Create missing workflow instances for leave_requests
  FOR v_rec IN
    SELECT lr.id AS ref_id, lr.company_id, lr.employee_id, 'leave'::text AS req_type
    FROM leave_requests lr
    WHERE lr.company_id = v_company_id AND lr.status = 'pending'
      AND NOT EXISTS (SELECT 1 FROM workflow_instances wi WHERE wi.reference_id = lr.id AND wi.request_type = 'leave')
    UNION ALL
    SELECT ac.id, ac.company_id, ac.employee_id, 'attendance_correction'
    FROM attendance_corrections ac
    WHERE ac.company_id = v_company_id AND ac.status = 'pending'
      AND NOT EXISTS (SELECT 1 FROM workflow_instances wi WHERE wi.reference_id = ac.id AND wi.request_type = 'attendance_correction')
  LOOP
    BEGIN
      DECLARE
        v_emp_user_id uuid;
        v_template_id uuid;
        v_first_step record;
        v_req_pos uuid;
        v_approver_uid uuid;
        v_approver_pos uuid;
        v_approver_name text;
      BEGIN
        SELECT user_id, position_id INTO v_emp_user_id, v_req_pos FROM employees WHERE id = v_rec.employee_id AND company_id = v_company_id LIMIT 1;
        IF v_emp_user_id IS NULL THEN CONTINUE; END IF;

        SELECT id INTO v_template_id FROM workflow_templates
          WHERE company_id = v_company_id AND request_type = v_rec.req_type AND is_active = true LIMIT 1;
        IF v_template_id IS NULL THEN
          SELECT id INTO v_template_id FROM workflow_templates
            WHERE company_id = v_company_id AND request_type = 'general' AND is_active = true LIMIT 1;
        END IF;

        IF v_template_id IS NOT NULL THEN
          SELECT * INTO v_first_step FROM workflow_steps WHERE template_id = v_template_id ORDER BY step_order LIMIT 1;
        END IF;

        IF v_req_pos IS NOT NULL THEN
          SELECT r.approver_user_id, r.approver_position_id, r.approver_name
          INTO v_approver_uid, v_approver_pos, v_approver_name
          FROM resolve_hierarchy_approver(v_req_pos, v_company_id) r LIMIT 1;
        END IF;
        IF v_approver_uid IS NULL THEN
          SELECT ur.user_id INTO v_approver_uid FROM user_roles ur WHERE ur.role = 'hr_manager' AND ur.tenant_id = v_company_id LIMIT 1;
        END IF;
        IF v_approver_uid IS NULL THEN
          SELECT ur.user_id INTO v_approver_uid FROM user_roles ur WHERE ur.role = 'tenant_admin' AND ur.tenant_id = v_company_id LIMIT 1;
        END IF;
        IF v_approver_uid = v_emp_user_id THEN
          SELECT ur.user_id INTO v_approver_uid FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id AND ur.user_id != v_emp_user_id LIMIT 1;
        END IF;

        INSERT INTO workflow_instances (
          company_id, template_id, request_type, reference_id, requester_user_id,
          current_step_order, status, current_approver_id, current_approver_position_id,
          routing_mode, fallback_used, routing_snapshot
        ) VALUES (
          v_company_id, v_template_id, v_rec.req_type, v_rec.ref_id, v_emp_user_id,
          COALESCE(v_first_step.step_order, 1),
          CASE WHEN v_approver_uid IS NOT NULL THEN 'pending_approval' ELSE 'submitted' END,
          v_approver_uid, v_approver_pos,
          'manager_chain', true,
          jsonb_build_object('repaired', true, 'repaired_by', v_user_id, 'repaired_at', now()::text)
        ) RETURNING id INTO v_instance_id;

        INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order)
        VALUES (v_instance_id, v_company_id, v_emp_user_id, 'submit', 'draft', 'pending_approval', 1);

        v_created := v_created + 1;
      END;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  -- B. Fix instances with NULL approver
  FOR v_rec IN
    SELECT wi.id, wi.requester_user_id, wi.company_id
    FROM workflow_instances wi
    WHERE wi.company_id = v_company_id AND wi.status IN ('submitted', 'pending_approval') AND wi.current_approver_id IS NULL
  LOOP
    BEGIN
      DECLARE
        v_req_pos uuid;
        v_approver_uid uuid;
        v_approver_pos uuid;
      BEGIN
        SELECT position_id INTO v_req_pos FROM employees WHERE user_id = v_rec.requester_user_id AND company_id = v_company_id LIMIT 1;
        IF v_req_pos IS NOT NULL THEN
          SELECT r.approver_user_id, r.approver_position_id INTO v_approver_uid, v_approver_pos
          FROM resolve_hierarchy_approver(v_req_pos, v_company_id) r LIMIT 1;
        END IF;
        IF v_approver_uid IS NULL THEN
          SELECT ur.user_id INTO v_approver_uid FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id LIMIT 1;
        END IF;
        IF v_approver_uid = v_rec.requester_user_id THEN
          SELECT ur.user_id INTO v_approver_uid FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id AND ur.user_id != v_rec.requester_user_id LIMIT 1;
        END IF;
        IF v_approver_uid IS NOT NULL THEN
          UPDATE workflow_instances SET current_approver_id = v_approver_uid, current_approver_position_id = v_approver_pos, status = 'pending_approval', fallback_used = true, updated_at = now() WHERE id = v_rec.id;
          v_repaired := v_repaired + 1;
        END IF;
      END;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('created', v_created, 'repaired', v_repaired);
END;
$$;

-- =====================================================
-- Rewrite process_approval_action
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_approval_action(
  p_instance_id uuid,
  p_action text,
  p_comments text DEFAULT NULL,
  p_signature_data text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance record;
  v_step record;
  v_next_step record;
  v_from_status text;
  v_to_status text;
  v_company_id uuid;
  v_actor_user_id uuid;
  v_generated_doc_id uuid;
  v_template record;
  v_next_approver_uid uuid;
  v_next_approver_pos uuid;
  v_next_approver_name text;
  v_requester_pos uuid;
BEGIN
  v_actor_user_id := auth.uid();
  IF v_actor_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_instance FROM workflow_instances WHERE id = p_instance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workflow instance not found'; END IF;

  v_company_id := v_instance.company_id;
  v_from_status := v_instance.status;

  IF p_action IN ('approve', 'reject', 'return') THEN
    IF v_instance.current_approver_id IS NOT NULL AND v_instance.current_approver_id != v_actor_user_id
       AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_actor_user_id AND role IN ('hr_manager', 'tenant_admin', 'admin') AND tenant_id = v_company_id) THEN
      RAISE EXCEPTION 'ليس لديك صلاحية اتخاذ هذا الإجراء';
    END IF;
    IF v_instance.requester_user_id = v_actor_user_id AND p_action = 'approve'
       AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_actor_user_id AND role IN ('hr_manager', 'tenant_admin', 'admin') AND tenant_id = v_company_id) THEN
      RAISE EXCEPTION 'لا يمكنك الموافقة على طلبك الخاص';
    END IF;
  END IF;

  IF v_instance.template_id IS NOT NULL THEN
    SELECT * INTO v_step FROM workflow_steps WHERE template_id = v_instance.template_id AND step_order = v_instance.current_step_order;
  END IF;

  SELECT e.position_id INTO v_requester_pos
  FROM employees e WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;

  CASE p_action
    WHEN 'submit' THEN
      v_to_status := 'pending_approval';
      UPDATE workflow_instances SET status = v_to_status, current_step_order = 1, submitted_at = now(), updated_at = now() WHERE id = p_instance_id;

    WHEN 'approve' THEN
      IF v_instance.template_id IS NOT NULL THEN
        SELECT * INTO v_next_step FROM workflow_steps
        WHERE template_id = v_instance.template_id AND step_order > v_instance.current_step_order ORDER BY step_order LIMIT 1;
      END IF;

      IF v_next_step IS NOT NULL THEN
        IF v_next_step.routing_mode = 'manager_chain' AND v_requester_pos IS NOT NULL THEN
          SELECT r.approver_user_id, r.approver_position_id, r.approver_name
          INTO v_next_approver_uid, v_next_approver_pos, v_next_approver_name
          FROM resolve_hierarchy_approver(v_requester_pos, v_company_id) r LIMIT 1;
        ELSIF v_next_step.routing_mode = 'position' AND v_next_step.approver_position_id IS NOT NULL THEN
          SELECT e.user_id, e.name_ar, e.position_id INTO v_next_approver_uid, v_next_approver_name, v_next_approver_pos
          FROM employees e WHERE e.position_id = v_next_step.approver_position_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
        ELSIF v_next_step.routing_mode = 'role' AND v_next_step.approver_role IS NOT NULL THEN
          SELECT ur.user_id INTO v_next_approver_uid
          FROM user_roles ur WHERE ur.role::text = v_next_step.approver_role AND ur.tenant_id = v_company_id LIMIT 1;
          IF v_next_approver_uid IS NOT NULL THEN
            SELECT e.name_ar, e.position_id INTO v_next_approver_name, v_next_approver_pos
            FROM employees e WHERE e.user_id = v_next_approver_uid AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
          END IF;
        END IF;
        IF v_next_approver_uid IS NULL THEN
          SELECT ur.user_id INTO v_next_approver_uid FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id LIMIT 1;
        END IF;

        v_to_status := 'pending_approval';
        UPDATE workflow_instances SET status = v_to_status, current_step_order = v_next_step.step_order,
          current_approver_id = v_next_approver_uid, current_approver_position_id = v_next_approver_pos, updated_at = now()
        WHERE id = p_instance_id;
      ELSE
        v_to_status := 'approved';
        UPDATE workflow_instances SET status = v_to_status, approved_at = now(), completed_at = now(), current_approver_id = NULL, updated_at = now() WHERE id = p_instance_id;
        -- Sync to source
        IF v_instance.request_type = 'leave' THEN UPDATE leave_requests SET status = 'approved' WHERE id = v_instance.reference_id;
        ELSIF v_instance.request_type = 'attendance_correction' THEN UPDATE attendance_corrections SET status = 'approved' WHERE id = v_instance.reference_id;
        ELSIF v_instance.request_type = 'payroll' THEN UPDATE payroll_runs SET status = 'approved' WHERE id = v_instance.reference_id;
        ELSIF v_instance.request_type = 'contract' THEN UPDATE contracts SET status = 'active' WHERE id = v_instance.reference_id;
        ELSIF v_instance.request_type IN ('document', 'certificate', 'certificate_experience', 'certificate_salary', 'certificate_employment') THEN
          UPDATE documents SET status = 'approved', approved_at = now(), approved_by = v_actor_user_id WHERE id = v_instance.reference_id;
          IF v_instance.template_id IS NOT NULL THEN
            SELECT * INTO v_template FROM workflow_templates WHERE id = v_instance.template_id;
            IF v_template.auto_generate_doc_type IS NOT NULL THEN
              BEGIN
                INSERT INTO generated_documents (company_id, employee_id, document_type, status, generated_by)
                SELECT v_company_id, e.id, v_template.auto_generate_doc_type, 'generated', v_actor_user_id
                FROM employees e WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_company_id LIMIT 1
                RETURNING id INTO v_generated_doc_id;
              EXCEPTION WHEN OTHERS THEN NULL;
              END;
            END IF;
          END IF;
        END IF;
      END IF;

    WHEN 'reject' THEN
      v_to_status := 'rejected';
      UPDATE workflow_instances SET status = v_to_status, rejected_at = now(), completed_at = now(), final_comments = p_comments, updated_at = now() WHERE id = p_instance_id;
      IF v_instance.request_type = 'leave' THEN UPDATE leave_requests SET status = 'rejected' WHERE id = v_instance.reference_id;
      ELSIF v_instance.request_type = 'attendance_correction' THEN UPDATE attendance_corrections SET status = 'rejected' WHERE id = v_instance.reference_id;
      ELSIF v_instance.request_type IN ('document', 'certificate', 'certificate_experience', 'certificate_salary', 'certificate_employment') THEN
        UPDATE documents SET status = 'rejected', rejected_at = now() WHERE id = v_instance.reference_id;
      END IF;

    WHEN 'return' THEN
      v_to_status := 'returned';
      UPDATE workflow_instances SET status = v_to_status, final_comments = p_comments, updated_at = now() WHERE id = p_instance_id;
      IF v_instance.request_type = 'leave' THEN UPDATE leave_requests SET status = 'returned' WHERE id = v_instance.reference_id;
      ELSIF v_instance.request_type IN ('document', 'certificate', 'certificate_experience', 'certificate_salary', 'certificate_employment') THEN
        UPDATE documents SET status = 'returned', returned_at = now() WHERE id = v_instance.reference_id;
      END IF;

    WHEN 'escalate' THEN
      v_to_status := 'pending_approval';
      IF v_instance.current_approver_position_id IS NOT NULL THEN
        SELECT r.approver_user_id, r.approver_position_id INTO v_next_approver_uid, v_next_approver_pos
        FROM resolve_hierarchy_approver(v_instance.current_approver_position_id, v_company_id) r LIMIT 1;
      END IF;
      IF v_next_approver_uid IS NULL THEN
        SELECT ur.user_id INTO v_next_approver_uid FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id LIMIT 1;
      END IF;
      UPDATE workflow_instances SET status = v_to_status, is_escalated = true, current_approver_id = v_next_approver_uid, current_approver_position_id = v_next_approver_pos, updated_at = now() WHERE id = p_instance_id;

    WHEN 'lock' THEN
      v_to_status := 'locked';
      UPDATE workflow_instances SET status = v_to_status, updated_at = now() WHERE id = p_instance_id;

    WHEN 'archive' THEN
      v_to_status := 'archived';
      UPDATE workflow_instances SET status = v_to_status, updated_at = now() WHERE id = p_instance_id;

    ELSE RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, comments, signature_data)
  VALUES (p_instance_id, v_company_id, v_actor_user_id, p_action, v_from_status, v_to_status, v_instance.current_step_order, p_comments, p_signature_data);

  IF p_action IN ('approve', 'reject', 'return') THEN
    BEGIN
      INSERT INTO notifications (company_id, user_id, title, message, type, link)
      VALUES (v_company_id, v_instance.requester_user_id,
        CASE p_action WHEN 'approve' THEN 'تمت الموافقة على طلبك' WHEN 'reject' THEN 'تم رفض طلبك' ELSE 'تم إرجاع طلبك' END,
        v_instance.request_type, 'info', '/employee/requests');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('action', p_action, 'from_status', v_from_status, 'to_status', v_to_status, 'instance_id', p_instance_id, 'generated_doc_id', v_generated_doc_id);
END;
$$;
