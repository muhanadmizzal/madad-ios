
-- 1. Update get_my_visible_workflow_instances to include finance_manager visibility
CREATE OR REPLACE FUNCTION public.get_my_visible_workflow_instances(p_status text DEFAULT NULL, p_request_type text DEFAULT NULL)
RETURNS SETOF workflow_instances
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_is_admin boolean;
  v_is_hr boolean;
  v_is_manager boolean;
  v_is_finance boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  v_is_admin := has_role(v_user_id, 'admin') OR has_role(v_user_id, 'tenant_admin');
  v_is_hr := has_role(v_user_id, 'hr_manager') OR has_role(v_user_id, 'hr_officer');
  v_is_manager := has_role(v_user_id, 'manager');
  v_is_finance := has_role(v_user_id, 'finance_manager');

  RETURN QUERY
  SELECT wi.*
  FROM workflow_instances wi
  WHERE wi.company_id = v_company_id
    AND (p_status IS NULL OR p_status = 'all' OR wi.status = p_status)
    AND (p_request_type IS NULL OR p_request_type = 'all' OR wi.request_type = p_request_type)
    AND (
      v_is_admin OR v_is_hr
      OR wi.requester_user_id = v_user_id
      OR (v_is_finance AND wi.request_type IN ('payroll', 'salary_change', 'final_settlement'))
      OR (v_is_manager AND wi.requester_user_id IN (
        SELECT e.user_id FROM employees e WHERE e.manager_user_id = v_user_id AND e.company_id = v_company_id
      ))
    )
  ORDER BY wi.created_at DESC;
END;
$$;

-- 2. Update process_approval_action to handle salary_change and finance_manager role
CREATE OR REPLACE FUNCTION public.process_approval_action(p_instance_id uuid, p_action text, p_comments text DEFAULT NULL, p_signature_data text DEFAULT NULL)
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
  v_next_step_record RECORD;
BEGIN
  SELECT * INTO v_instance FROM workflow_instances WHERE id = p_instance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workflow instance not found'; END IF;

  v_company_id := v_instance.company_id;
  v_from_status := v_instance.status;
  v_step_order := v_instance.current_step_order;
  v_template_id := v_instance.template_id;

  SELECT company_id INTO v_actor_company_id FROM profiles WHERE user_id = v_actor_id;
  IF v_actor_company_id IS NULL OR v_actor_company_id != v_company_id THEN
    RAISE EXCEPTION 'Cross-tenant action not allowed';
  END IF;

  IF v_instance.requester_user_id = v_actor_id AND p_action IN ('approve', 'reject', 'escalate', 'lock') THEN
    RAISE EXCEPTION 'Cannot approve or reject your own request';
  END IF;

  IF p_action IN ('approve', 'reject', 'escalate', 'lock', 'return') THEN
    IF NOT (has_role(v_actor_id, 'admin') OR has_role(v_actor_id, 'tenant_admin') 
            OR has_role(v_actor_id, 'hr_manager') OR has_role(v_actor_id, 'hr_officer')
            OR has_role(v_actor_id, 'manager')
            OR (has_role(v_actor_id, 'finance_manager') AND v_instance.request_type IN ('payroll', 'salary_change', 'final_settlement'))
            ) THEN
      RAISE EXCEPTION 'Insufficient role to perform this action';
    END IF;
  END IF;

  IF has_role(v_actor_id, 'manager') 
     AND NOT has_role(v_actor_id, 'admin') 
     AND NOT has_role(v_actor_id, 'hr_manager')
     AND p_action IN ('approve', 'reject', 'return') THEN
    DECLARE
      v_ref_employee_id uuid;
      v_is_direct_report boolean := false;
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
        SELECT EXISTS(SELECT 1 FROM employees WHERE id = v_ref_employee_id AND manager_user_id = v_actor_id)
        INTO v_is_direct_report;
        IF NOT v_is_direct_report THEN
          RAISE EXCEPTION 'You can only approve requests for your direct reports';
        END IF;
      END IF;
    END;
  END IF;

  CASE p_action
    WHEN 'submit' THEN v_to_status := 'submitted';
    WHEN 'approve' THEN
      IF v_template_id IS NOT NULL THEN
        SELECT count(*) INTO v_total_steps FROM workflow_steps WHERE template_id = v_template_id;
        IF v_step_order < v_total_steps THEN
          v_to_status := 'pending_approval';
          v_next_step := v_step_order + 1;
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

  INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, comments, signature_data)
  VALUES (p_instance_id, v_company_id, v_actor_id, p_action, v_from_status, v_to_status, v_step_order, p_comments, p_signature_data);

  UPDATE workflow_instances SET
    status = v_to_status,
    current_step_order = COALESCE(v_next_step, current_step_order),
    is_escalated = CASE WHEN p_action = 'escalate' THEN true ELSE is_escalated END,
    approved_at = CASE WHEN v_to_status = 'approved' THEN now() ELSE approved_at END,
    rejected_at = CASE WHEN v_to_status = 'rejected' THEN now() ELSE rejected_at END,
    final_comments = COALESCE(p_comments, final_comments),
    updated_at = now()
  WHERE id = p_instance_id;

  IF p_signature_data IS NOT NULL THEN
    INSERT INTO digital_signatures (company_id, user_id, document_id, document_type, signature_data, signature_type)
    VALUES (v_company_id, v_actor_id, p_instance_id, 'approval', p_signature_data, 'drawn');
  END IF;

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
        status = CASE v_to_status 
          WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'returned' THEN 'pending' ELSE status END,
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

  IF v_to_status = 'approved' THEN
    BEGIN
      v_generated_doc_id := auto_generate_document_on_approval(p_instance_id);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO audit_logs (company_id, user_id, table_name, action, record_id, new_values)
      VALUES (v_company_id, v_actor_id, 'generated_documents', 'auto_generate_failed', p_instance_id,
        jsonb_build_object('error', SQLERRM));
    END;
  END IF;

  IF v_next_step IS NOT NULL AND v_template_id IS NOT NULL THEN
    SELECT * INTO v_next_step_record FROM workflow_steps WHERE template_id = v_template_id AND step_order = v_next_step;
    IF FOUND AND v_next_step_record.approver_role IS NOT NULL THEN
      INSERT INTO notifications (company_id, user_id, title, message, type, link)
      SELECT v_company_id, ur.user_id, 'طلب موافقة - المرحلة ' || v_next_step, v_instance.request_type, 'info', '/approvals'
      FROM user_roles ur
      WHERE ur.role::text = v_next_step_record.approver_role AND ur.tenant_id = v_company_id
      LIMIT 5;
    END IF;
  END IF;

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

  INSERT INTO audit_logs (company_id, user_id, table_name, action, record_id, new_values)
  VALUES (v_company_id, v_actor_id, 'workflow_instances', 'approval_' || p_action, p_instance_id,
    jsonb_build_object('action', p_action, 'from_status', v_from_status, 'to_status', v_to_status, 
    'step_order', v_step_order, 'request_type', v_instance.request_type,
    'generated_doc_id', v_generated_doc_id));

  RETURN json_build_object('success', true, 'action', p_action, 'from_status', v_from_status, 
    'to_status', v_to_status, 'generated_doc_id', v_generated_doc_id);
END;
$$;
