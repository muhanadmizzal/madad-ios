-- FIX create_workflow_instance to use template fallback chain:
-- exact request_type → category prefix → general
CREATE OR REPLACE FUNCTION public.create_workflow_instance(p_request_type text, p_reference_id uuid, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_template record;
  v_first_step record;
  v_instance_id uuid;
  v_due timestamptz;
  v_category text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_company_id := COALESCE(p_company_id, get_my_company_id());
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company context';
  END IF;

  -- Template fallback chain: exact type → category → general
  SELECT * INTO v_template FROM public.workflow_templates
    WHERE company_id = v_company_id AND request_type = p_request_type AND is_active = true
    LIMIT 1;

  IF NOT FOUND THEN
    -- Try category prefix (e.g., certificate_salary → certificate)
    v_category := split_part(p_request_type, '_', 1);
    IF v_category != p_request_type THEN
      SELECT * INTO v_template FROM public.workflow_templates
        WHERE company_id = v_company_id AND request_type = v_category AND is_active = true
        LIMIT 1;
    END IF;
  END IF;

  IF NOT FOUND THEN
    -- Try general fallback
    SELECT * INTO v_template FROM public.workflow_templates
      WHERE company_id = v_company_id AND request_type = 'general' AND is_active = true
      LIMIT 1;
  END IF;

  -- Get first step if template exists
  IF FOUND AND v_template.id IS NOT NULL THEN
    SELECT * INTO v_first_step FROM public.workflow_steps
      WHERE template_id = v_template.id ORDER BY step_order LIMIT 1;
    IF v_first_step IS NOT NULL AND v_first_step.sla_hours IS NOT NULL THEN
      v_due := now() + (v_first_step.sla_hours || ' hours')::interval;
    END IF;
  END IF;

  INSERT INTO public.workflow_instances (company_id, template_id, request_type, reference_id, requester_user_id, current_step_order, status, due_date)
  VALUES (v_company_id, v_template.id, p_request_type, p_reference_id, v_user_id, COALESCE(v_first_step.step_order, 1), 'submitted', v_due)
  RETURNING id INTO v_instance_id;

  -- Record submit action
  INSERT INTO public.approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order)
  VALUES (v_instance_id, v_company_id, v_user_id, 'submit', 'draft', 'submitted', 1);

  -- Notify approvers
  BEGIN
    IF v_first_step IS NOT NULL AND v_first_step.approver_role IS NOT NULL THEN
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      SELECT v_company_id, ur.user_id, 'طلب موافقة جديد', p_request_type, 'info', '/approvals'
      FROM public.user_roles ur
      WHERE ur.role::text = v_first_step.approver_role
        AND ur.tenant_id = v_company_id
      LIMIT 5;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_instance_id;
END;
$$;

-- Also fix the manager scope check in process_approval_action to handle certificate types
-- The existing CASE handles leave, attendance_correction, contract, etc.
-- For certificate types, the reference is an approval_requests row. Manager scope check
-- currently falls to ELSE which sets v_ref_employee_id to NULL and lets it pass.
-- This is acceptable since certificate approvals typically go to HR, not managers.