
-- Drop old function signature first
DROP FUNCTION IF EXISTS public.process_approval_action(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.create_workflow_instance(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.sync_approval_to_source(text, uuid, text);

-- =============================================================
-- PART 1: Position-based access helper (SECURITY DEFINER)
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_accessible_position_ids(p_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_position_id uuid;
  v_result uuid[] := '{}';
BEGIN
  SELECT e.position_id INTO v_position_id
  FROM employees e WHERE e.user_id = p_user_id AND e.status = 'active' LIMIT 1;
  IF v_position_id IS NULL THEN RETURN v_result; END IF;
  WITH RECURSIVE subtree AS (
    SELECT id FROM positions WHERE id = v_position_id
    UNION ALL
    SELECT p.id FROM positions p JOIN subtree s ON p.parent_position_id = s.id
  )
  SELECT array_agg(id) INTO v_result FROM subtree;
  RETURN COALESCE(v_result, '{}');
END;
$$;

-- =============================================================
-- PART 2: Resolve approver from position hierarchy
-- =============================================================

CREATE OR REPLACE FUNCTION public.resolve_position_approver(
  p_requester_position_id uuid,
  p_step_order int DEFAULT 1
)
RETURNS TABLE(approver_user_id uuid, approver_position_id uuid, approver_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current uuid; v_depth int := 0; v_approver_uid uuid; v_approver_name text; v_steps_found int := 0;
BEGIN
  SELECT parent_position_id INTO v_current FROM positions WHERE id = p_requester_position_id;
  WHILE v_current IS NOT NULL AND v_depth < 20 LOOP
    v_depth := v_depth + 1;
    SELECT e.user_id, e.name_ar INTO v_approver_uid, v_approver_name
    FROM employees e WHERE e.position_id = v_current AND e.status = 'active' LIMIT 1;
    IF v_approver_uid IS NOT NULL THEN
      v_steps_found := v_steps_found + 1;
      IF v_steps_found >= p_step_order THEN
        approver_user_id := v_approver_uid; approver_position_id := v_current; approver_name := v_approver_name;
        RETURN NEXT; RETURN;
      END IF;
    END IF;
    SELECT parent_position_id INTO v_current FROM positions WHERE id = v_current;
  END LOOP;
  -- Fallback: tenant_admin
  SELECT ur.user_id INTO v_approver_uid FROM user_roles ur
  JOIN employees emp ON emp.user_id = ur.user_id AND emp.status = 'active'
  WHERE ur.role = 'tenant_admin' LIMIT 1;
  IF v_approver_uid IS NOT NULL THEN
    SELECT name_ar INTO v_approver_name FROM employees WHERE user_id = v_approver_uid LIMIT 1;
    approver_user_id := v_approver_uid; approver_position_id := NULL; approver_name := v_approver_name;
    RETURN NEXT;
  END IF;
  RETURN;
END;
$$;

-- =============================================================
-- PART 3: sync_approval_to_source
-- =============================================================

CREATE OR REPLACE FUNCTION public.sync_approval_to_source(
  p_request_type text, p_reference_id uuid, p_new_status text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  CASE p_request_type
    WHEN 'leave' THEN
      UPDATE leave_requests SET status = p_new_status, updated_at = now() WHERE id = p_reference_id;
    WHEN 'attendance_correction' THEN
      UPDATE attendance_corrections SET status = p_new_status, updated_at = now() WHERE id = p_reference_id;
    WHEN 'payroll' THEN
      UPDATE payroll_runs SET status = CASE p_new_status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'draft' ELSE status END, updated_at = now() WHERE id = p_reference_id;
    WHEN 'contract' THEN
      UPDATE contracts SET status = CASE p_new_status WHEN 'approved' THEN 'active' WHEN 'rejected' THEN 'draft' ELSE status END, updated_at = now() WHERE id = p_reference_id;
    WHEN 'document' THEN
      UPDATE documents SET status = p_new_status,
        approved_at = CASE WHEN p_new_status = 'approved' THEN now() ELSE approved_at END,
        rejected_at = CASE WHEN p_new_status = 'rejected' THEN now() ELSE rejected_at END,
        returned_at = CASE WHEN p_new_status = 'returned' THEN now() ELSE returned_at END
      WHERE id = p_reference_id;
    WHEN 'certificate', 'certificate_experience', 'certificate_salary', 'certificate_employment' THEN
      UPDATE generated_documents SET status = p_new_status WHERE id = p_reference_id;
    WHEN 'final_settlement' THEN
      UPDATE exit_clearance SET status = CASE p_new_status WHEN 'approved' THEN 'completed' WHEN 'rejected' THEN 'pending' ELSE status END WHERE id = p_reference_id;
    ELSE NULL;
  END CASE;
END;
$$;

-- =============================================================
-- PART 4: process_approval_action with position routing
-- =============================================================

CREATE FUNCTION public.process_approval_action(
  p_instance_id uuid, p_action text, p_comments text DEFAULT NULL, p_signature_data text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_instance record; v_step record; v_next_step record;
  v_from_status text; v_to_status text; v_company_id uuid;
  v_actor_user_id uuid; v_generated_doc_id uuid; v_template record;
BEGIN
  v_actor_user_id := auth.uid();
  IF v_actor_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_instance FROM workflow_instances WHERE id = p_instance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workflow instance not found'; END IF;

  v_company_id := v_instance.company_id;
  v_from_status := v_instance.status;

  SELECT * INTO v_step FROM workflow_steps
  WHERE template_id = v_instance.template_id AND step_order = v_instance.current_step_order;

  CASE p_action
    WHEN 'submit' THEN
      v_to_status := 'pending_approval';
      UPDATE workflow_instances SET status = v_to_status, current_step_order = 1, submitted_at = now(), updated_at = now() WHERE id = p_instance_id;
    WHEN 'approve' THEN
      SELECT * INTO v_next_step FROM workflow_steps
      WHERE template_id = v_instance.template_id AND step_order = v_instance.current_step_order + 1;
      IF v_next_step IS NOT NULL THEN
        v_to_status := 'pending_approval';
        UPDATE workflow_instances SET current_step_order = v_next_step.step_order, updated_at = now(),
          due_date = CASE WHEN v_next_step.sla_hours IS NOT NULL THEN now() + (v_next_step.sla_hours || ' hours')::interval ELSE NULL END
        WHERE id = p_instance_id;
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
      UPDATE workflow_instances SET is_escalated = true, updated_at = now() WHERE id = p_instance_id;
    WHEN 'lock' THEN
      v_to_status := 'locked';
      UPDATE workflow_instances SET status = 'locked', updated_at = now() WHERE id = p_instance_id;
    WHEN 'archive' THEN
      v_to_status := 'archived';
      UPDATE workflow_instances SET status = 'archived', updated_at = now() WHERE id = p_instance_id;
    ELSE RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  INSERT INTO approval_actions (instance_id, company_id, action, from_status, to_status, actor_user_id, comments, signature_data, step_order)
  VALUES (p_instance_id, v_company_id, p_action, v_from_status, v_to_status, v_actor_user_id, p_comments, p_signature_data, v_instance.current_step_order);

  IF v_to_status = 'approved' THEN
    SELECT * INTO v_template FROM workflow_templates WHERE id = v_instance.template_id;
    IF v_template.auto_generate_doc_type IS NOT NULL THEN
      INSERT INTO generated_documents (company_id, employee_id, document_type, status, workflow_instance_id, language)
      SELECT v_company_id,
        COALESCE((SELECT employee_id FROM leave_requests WHERE id = v_instance.reference_id),
                 (SELECT employee_id FROM attendance_corrections WHERE id = v_instance.reference_id)),
        v_template.auto_generate_doc_type, 'pending', p_instance_id, 'ar'
      RETURNING id INTO v_generated_doc_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action, 'from_status', v_from_status, 'to_status', v_to_status, 'generated_doc_id', v_generated_doc_id);
END;
$$;

-- =============================================================
-- PART 5: Position-aware create_workflow_instance
-- =============================================================

CREATE FUNCTION public.create_workflow_instance(
  p_request_type text, p_reference_id uuid, p_company_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company_id uuid; v_user_id uuid; v_template_id uuid; v_instance_id uuid;
  v_first_step record; v_requester_position_id uuid; v_routing_snapshot jsonb; v_approver record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_company_id := COALESCE(p_company_id, public.get_my_company_id());
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;

  SELECT id INTO v_template_id FROM workflow_templates
  WHERE company_id = v_company_id AND request_type = p_request_type AND is_active = true LIMIT 1;
  IF v_template_id IS NULL THEN RAISE EXCEPTION 'لا يوجد قالب سير عمل نشط لهذا النوع من الطلبات'; END IF;

  SELECT * INTO v_first_step FROM workflow_steps WHERE template_id = v_template_id ORDER BY step_order LIMIT 1;

  SELECT e.position_id INTO v_requester_position_id
  FROM employees e WHERE e.user_id = v_user_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;

  v_routing_snapshot := jsonb_build_object('requester_position_id', v_requester_position_id, 'routing_mode', COALESCE(v_first_step.routing_mode, 'role'));

  IF v_first_step.routing_mode IN ('position', 'manager_chain') AND v_requester_position_id IS NOT NULL THEN
    SELECT * INTO v_approver FROM resolve_position_approver(v_requester_position_id, 1);
    IF v_approver IS NOT NULL AND v_approver.approver_user_id IS NOT NULL THEN
      v_routing_snapshot := v_routing_snapshot || jsonb_build_object(
        'resolved_user_id', v_approver.approver_user_id,
        'approver_position_id', v_approver.approver_position_id,
        'approver_name', v_approver.approver_name
      );
    END IF;
  END IF;

  INSERT INTO workflow_instances (company_id, template_id, request_type, reference_id, requester_user_id, status, current_step_order, routing_snapshot, due_date)
  VALUES (v_company_id, v_template_id, p_request_type, p_reference_id, v_user_id, 'submitted', 1, v_routing_snapshot,
    CASE WHEN v_first_step.sla_hours IS NOT NULL THEN now() + (v_first_step.sla_hours || ' hours')::interval ELSE NULL END)
  RETURNING id INTO v_instance_id;

  RETURN v_instance_id;
END;
$$;
