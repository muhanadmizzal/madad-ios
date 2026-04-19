
-- ============================================================
-- Consolidate workflow routing: drop old duplicates, create unified version
-- ============================================================

-- Drop ALL old overloads of create_workflow_instance
DROP FUNCTION IF EXISTS public.create_workflow_instance(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.create_workflow_instance(text, uuid, uuid);

-- Unified resolve_hierarchy_approver: walks parent_position_id chain
-- Returns first filled parent position's employee
CREATE OR REPLACE FUNCTION public.resolve_hierarchy_approver(
  p_requester_position_id uuid,
  p_company_id uuid
)
RETURNS TABLE(approver_user_id uuid, approver_position_id uuid, approver_name text, depth int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current uuid;
  v_depth int := 0;
  v_uid uuid;
  v_name text;
BEGIN
  -- Walk up the position hierarchy
  SELECT parent_position_id INTO v_current
  FROM positions WHERE id = p_requester_position_id;

  WHILE v_current IS NOT NULL AND v_depth < 20 LOOP
    v_depth := v_depth + 1;

    SELECT e.user_id, e.name_ar INTO v_uid, v_name
    FROM employees e
    WHERE e.position_id = v_current
      AND e.company_id = p_company_id
      AND e.status = 'active'
    LIMIT 1;

    IF v_uid IS NOT NULL THEN
      approver_user_id := v_uid;
      approver_position_id := v_current;
      approver_name := v_name;
      depth := v_depth;
      RETURN NEXT;
      RETURN; -- found, stop
    END IF;

    -- Position vacant, walk further up
    SELECT parent_position_id INTO v_current FROM positions WHERE id = v_current;
  END LOOP;

  -- Fallback: HR manager role
  SELECT ur.user_id INTO v_uid
  FROM user_roles ur WHERE ur.role = 'hr_manager' AND ur.tenant_id = p_company_id LIMIT 1;
  IF v_uid IS NOT NULL THEN
    approver_user_id := v_uid;
    approver_position_id := NULL;
    SELECT name_ar INTO approver_name FROM employees WHERE user_id = v_uid AND company_id = p_company_id LIMIT 1;
    depth := 99;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Fallback: tenant_admin
  SELECT ur.user_id INTO v_uid
  FROM user_roles ur WHERE ur.role = 'tenant_admin' AND ur.tenant_id = p_company_id LIMIT 1;
  IF v_uid IS NOT NULL THEN
    approver_user_id := v_uid;
    approver_position_id := NULL;
    SELECT name_ar INTO approver_name FROM employees WHERE user_id = v_uid AND company_id = p_company_id LIMIT 1;
    depth := 100;
    RETURN NEXT;
    RETURN;
  END IF;
END;
$$;

-- ============================================================
-- Unified create_workflow_instance with hierarchy fallback
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_workflow_instance(
  p_request_type text,
  p_reference_id uuid,
  p_company_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_template_id uuid;
  v_first_step record;
  v_instance_id uuid;
  v_requester_position_id uuid;
  v_approver record;
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

  -- Find template: exact type → category → general
  SELECT id INTO v_template_id FROM workflow_templates
    WHERE company_id = v_company_id AND request_type = p_request_type AND is_active = true LIMIT 1;
  IF v_template_id IS NULL THEN
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

  -- Get requester's position
  SELECT e.position_id INTO v_requester_position_id
  FROM employees e WHERE e.user_id = v_user_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;

  v_routing_mode := COALESCE(v_first_step.routing_mode, 'manager_chain');

  -- ── Resolve approver based on routing mode ──

  -- A. Explicit position approver
  IF v_first_step IS NOT NULL AND v_first_step.routing_mode = 'position' AND v_first_step.approver_position_id IS NOT NULL THEN
    SELECT e.user_id, e.name_ar INTO v_resolved_uid, v_resolved_name
    FROM employees e WHERE e.position_id = v_first_step.approver_position_id
      AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
    v_resolved_pos := v_first_step.approver_position_id;
    -- If explicit position is vacant, fall back to hierarchy from that position
    IF v_resolved_uid IS NULL THEN
      SELECT r.approver_user_id, r.approver_position_id, r.approver_name
      INTO v_resolved_uid, v_resolved_pos, v_resolved_name
      FROM resolve_hierarchy_approver(v_first_step.approver_position_id, v_company_id) r LIMIT 1;
      v_fallback := true;
    END IF;

  -- B. Role-based routing
  ELSIF v_first_step IS NOT NULL AND v_first_step.routing_mode = 'role' AND v_first_step.approver_role IS NOT NULL THEN
    IF v_first_step.approver_role = 'manager' AND v_requester_position_id IS NOT NULL THEN
      -- 'manager' role = direct hierarchy
      SELECT r.approver_user_id, r.approver_position_id, r.approver_name
      INTO v_resolved_uid, v_resolved_pos, v_resolved_name
      FROM resolve_hierarchy_approver(v_requester_position_id, v_company_id) r LIMIT 1;
    ELSE
      SELECT ur.user_id INTO v_resolved_uid
      FROM user_roles ur WHERE ur.role::text = v_first_step.approver_role AND ur.tenant_id = v_company_id LIMIT 1;
      IF v_resolved_uid IS NOT NULL THEN
        SELECT name_ar INTO v_resolved_name FROM employees WHERE user_id = v_resolved_uid AND company_id = v_company_id LIMIT 1;
      END IF;
    END IF;
    -- If role not found, fall back to hierarchy
    IF v_resolved_uid IS NULL AND v_requester_position_id IS NOT NULL THEN
      SELECT r.approver_user_id, r.approver_position_id, r.approver_name
      INTO v_resolved_uid, v_resolved_pos, v_resolved_name
      FROM resolve_hierarchy_approver(v_requester_position_id, v_company_id) r LIMIT 1;
      v_fallback := true;
    END IF;

  -- C. Manager chain (default) — always use hierarchy
  ELSE
    IF v_requester_position_id IS NOT NULL THEN
      SELECT r.approver_user_id, r.approver_position_id, r.approver_name
      INTO v_resolved_uid, v_resolved_pos, v_resolved_name
      FROM resolve_hierarchy_approver(v_requester_position_id, v_company_id) r LIMIT 1;
    END IF;
    -- Ultra-fallback: HR or admin
    IF v_resolved_uid IS NULL THEN
      SELECT ur.user_id INTO v_resolved_uid
      FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id LIMIT 1;
      v_fallback := true;
    END IF;
  END IF;

  -- Prevent self-approval
  IF v_resolved_uid = v_user_id AND v_requester_position_id IS NOT NULL THEN
    -- Try next level up
    IF v_resolved_pos IS NOT NULL THEN
      SELECT r.approver_user_id, r.approver_position_id, r.approver_name
      INTO v_resolved_uid, v_resolved_pos, v_resolved_name
      FROM resolve_hierarchy_approver(v_resolved_pos, v_company_id) r LIMIT 1;
      v_fallback := true;
    END IF;
  END IF;

  -- Build routing snapshot
  v_routing_snapshot := jsonb_build_object(
    'requester_position_id', v_requester_position_id,
    'routing_mode', v_routing_mode,
    'resolved_user_id', v_resolved_uid,
    'approver_position_id', v_resolved_pos,
    'approver_name', v_resolved_name,
    'fallback_applied', v_fallback,
    'step', COALESCE(v_first_step.step_order, 1)
  );

  -- Insert instance
  INSERT INTO workflow_instances (
    company_id, template_id, request_type, reference_id, requester_user_id,
    current_step_order, status, due_date,
    current_approver_id, current_approver_position_id,
    routing_mode, fallback_used, routing_snapshot
  ) VALUES (
    v_company_id, v_template_id, p_request_type, p_reference_id, v_user_id,
    COALESCE(v_first_step.step_order, 1), 'submitted',
    CASE WHEN v_first_step IS NOT NULL AND v_first_step.sla_hours IS NOT NULL
      THEN now() + (v_first_step.sla_hours || ' hours')::interval ELSE NULL END,
    v_resolved_uid, v_resolved_pos,
    v_routing_mode, v_fallback, v_routing_snapshot
  ) RETURNING id INTO v_instance_id;

  -- Record submit action
  INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order)
  VALUES (v_instance_id, v_company_id, v_user_id, 'submit', 'draft', 'submitted', 1);

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

-- ============================================================
-- Update process_approval_action to resolve NEXT step approver via hierarchy
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_approval_action(
  p_instance_id uuid,
  p_action text,
  p_comments text DEFAULT NULL,
  p_signature_data text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  -- Verify actor is current approver or HR (prevent out-of-scope approval)
  IF p_action IN ('approve', 'reject', 'return') THEN
    IF v_instance.current_approver_id IS NOT NULL AND v_instance.current_approver_id != v_actor_user_id
       AND NOT get_is_tenant_hr(v_actor_user_id, v_company_id) THEN
      RAISE EXCEPTION 'ليس لديك صلاحية اتخاذ هذا الإجراء';
    END IF;
    -- Prevent self-approval
    IF v_instance.requester_user_id = v_actor_user_id AND p_action = 'approve'
       AND NOT get_is_tenant_hr(v_actor_user_id, v_company_id) THEN
      RAISE EXCEPTION 'لا يمكنك الموافقة على طلبك الخاص';
    END IF;
  END IF;

  SELECT * INTO v_step FROM workflow_steps
  WHERE template_id = v_instance.template_id AND step_order = v_instance.current_step_order;

  -- Get requester position for hierarchy resolution
  SELECT e.position_id INTO v_requester_pos
  FROM employees e WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;

  CASE p_action
    WHEN 'submit' THEN
      v_to_status := 'pending_approval';
      UPDATE workflow_instances SET status = v_to_status, current_step_order = 1, submitted_at = now(), updated_at = now() WHERE id = p_instance_id;

    WHEN 'approve' THEN
      SELECT * INTO v_next_step FROM workflow_steps
      WHERE template_id = v_instance.template_id AND step_order = v_instance.current_step_order + 1;

      IF v_next_step IS NOT NULL THEN
        v_to_status := 'pending_approval';

        -- Resolve next step's approver
        IF v_next_step.routing_mode = 'position' AND v_next_step.approver_position_id IS NOT NULL THEN
          SELECT e.user_id, e.name_ar INTO v_next_approver_uid, v_next_approver_name
          FROM employees e WHERE e.position_id = v_next_step.approver_position_id
            AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
          v_next_approver_pos := v_next_step.approver_position_id;
          IF v_next_approver_uid IS NULL THEN
            SELECT r.approver_user_id, r.approver_position_id, r.approver_name
            INTO v_next_approver_uid, v_next_approver_pos, v_next_approver_name
            FROM resolve_hierarchy_approver(v_next_step.approver_position_id, v_company_id) r LIMIT 1;
          END IF;
        ELSIF v_next_step.routing_mode = 'role' AND v_next_step.approver_role IS NOT NULL THEN
          SELECT ur.user_id INTO v_next_approver_uid
          FROM user_roles ur WHERE ur.role::text = v_next_step.approver_role AND ur.tenant_id = v_company_id LIMIT 1;
          IF v_next_approver_uid IS NULL AND v_requester_pos IS NOT NULL THEN
            SELECT r.approver_user_id, r.approver_position_id, r.approver_name
            INTO v_next_approver_uid, v_next_approver_pos, v_next_approver_name
            FROM resolve_hierarchy_approver(v_requester_pos, v_company_id) r LIMIT 1;
          END IF;
        ELSE
          -- Default: hierarchy from current approver's position or requester
          IF v_instance.current_approver_position_id IS NOT NULL THEN
            SELECT r.approver_user_id, r.approver_position_id, r.approver_name
            INTO v_next_approver_uid, v_next_approver_pos, v_next_approver_name
            FROM resolve_hierarchy_approver(v_instance.current_approver_position_id, v_company_id) r LIMIT 1;
          ELSIF v_requester_pos IS NOT NULL THEN
            SELECT r.approver_user_id, r.approver_position_id, r.approver_name
            INTO v_next_approver_uid, v_next_approver_pos, v_next_approver_name
            FROM resolve_hierarchy_approver(v_requester_pos, v_company_id) r LIMIT 1;
          END IF;
        END IF;

        UPDATE workflow_instances SET
          current_step_order = v_next_step.step_order,
          current_approver_id = v_next_approver_uid,
          current_approver_position_id = v_next_approver_pos,
          updated_at = now(),
          due_date = CASE WHEN v_next_step.sla_hours IS NOT NULL
            THEN now() + (v_next_step.sla_hours || ' hours')::interval ELSE NULL END
        WHERE id = p_instance_id;

        -- Notify next approver
        IF v_next_approver_uid IS NOT NULL THEN
          BEGIN
            INSERT INTO notifications (company_id, user_id, title, message, type, link)
            VALUES (v_company_id, v_next_approver_uid, 'طلب موافقة بانتظارك', v_instance.request_type, 'info', '/approvals');
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
      ELSE
        v_to_status := 'approved';
        UPDATE workflow_instances SET status = 'approved', completed_at = now(), final_comments = p_comments, updated_at = now() WHERE id = p_instance_id;
        PERFORM sync_approval_to_source(v_instance.request_type, v_instance.reference_id, 'approved');
      END IF;

    WHEN 'reject' THEN
      v_to_status := 'rejected';
      UPDATE workflow_instances SET status = 'rejected', completed_at = now(), final_comments = p_comments, updated_at = now() WHERE id = p_instance_id;
      PERFORM sync_approval_to_source(v_instance.request_type, v_instance.reference_id, 'rejected');

    WHEN 'return' THEN
      v_to_status := 'returned';
      UPDATE workflow_instances SET status = 'returned', final_comments = p_comments, updated_at = now() WHERE id = p_instance_id;
      PERFORM sync_approval_to_source(v_instance.request_type, v_instance.reference_id, 'returned');

    WHEN 'escalate' THEN
      v_to_status := 'pending_approval';
      -- Escalate: move approver up one level in hierarchy
      IF v_instance.current_approver_position_id IS NOT NULL THEN
        SELECT r.approver_user_id, r.approver_position_id, r.approver_name
        INTO v_next_approver_uid, v_next_approver_pos, v_next_approver_name
        FROM resolve_hierarchy_approver(v_instance.current_approver_position_id, v_company_id) r LIMIT 1;
        UPDATE workflow_instances SET
          current_approver_id = v_next_approver_uid,
          current_approver_position_id = v_next_approver_pos,
          is_escalated = true, updated_at = now()
        WHERE id = p_instance_id;
      ELSE
        UPDATE workflow_instances SET is_escalated = true, updated_at = now() WHERE id = p_instance_id;
      END IF;

    WHEN 'lock' THEN
      v_to_status := 'locked';
      UPDATE workflow_instances SET status = 'locked', updated_at = now() WHERE id = p_instance_id;

    WHEN 'archive' THEN
      v_to_status := 'archived';
      UPDATE workflow_instances SET status = 'archived', updated_at = now() WHERE id = p_instance_id;

    ELSE RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  -- Record action
  INSERT INTO approval_actions (instance_id, company_id, action, from_status, to_status, actor_user_id, comments, signature_data, step_order)
  VALUES (p_instance_id, v_company_id, p_action, v_from_status, v_to_status, v_actor_user_id, p_comments, p_signature_data, v_instance.current_step_order);

  -- Auto-generate document on final approval
  IF v_to_status = 'approved' THEN
    SELECT * INTO v_template FROM workflow_templates WHERE id = v_instance.template_id;
    IF v_template IS NOT NULL AND v_template.auto_generate_doc_type IS NOT NULL THEN
      BEGIN
        INSERT INTO generated_documents (company_id, employee_id, document_type, status, workflow_instance_id, language)
        SELECT v_company_id,
          COALESCE(
            (SELECT employee_id FROM leave_requests WHERE id = v_instance.reference_id),
            (SELECT employee_id FROM attendance_corrections WHERE id = v_instance.reference_id)
          ),
          v_template.auto_generate_doc_type, 'pending', p_instance_id, 'ar'
        RETURNING id INTO v_generated_doc_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'from_status', v_from_status,
    'to_status', v_to_status,
    'next_approver', v_next_approver_name,
    'generated_doc_id', v_generated_doc_id
  );
END;
$$;
