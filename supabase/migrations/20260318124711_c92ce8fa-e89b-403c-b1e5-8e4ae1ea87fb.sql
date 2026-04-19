
-- Fix: Make the upsert_request_document trigger fault-tolerant
-- so it doesn't prevent workflow creation if it encounters an error
CREATE OR REPLACE FUNCTION public.upsert_request_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doc_id uuid;
  v_ref_number text;
  v_employee_id uuid;
  v_employee_data jsonb;
  v_company_data jsonb;
  v_request_data jsonb;
  v_approval_history jsonb;
BEGIN
  -- Wrap entire body in exception handler so trigger never prevents workflow creation
  BEGIN
    -- Check if document already exists for this workflow
    SELECT id INTO v_doc_id FROM request_documents WHERE workflow_instance_id = NEW.id;
    
    -- Resolve employee_id from reference
    CASE NEW.request_type
      WHEN 'leave' THEN
        SELECT e.id, jsonb_build_object(
          'name_ar', e.name_ar, 'name_en', e.name_en, 'employee_code', e.employee_code,
          'position', e.position, 'department', d.name, 'branch', b.name
        ) INTO v_employee_id, v_employee_data
        FROM leave_requests lr
        JOIN employees e ON e.id = lr.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN branches b ON b.id = e.branch_id
        WHERE lr.id = NEW.reference_id;
        
        SELECT jsonb_build_object(
          'leave_type', lt.name, 'start_date', lr.start_date, 'end_date', lr.end_date,
          'reason', lr.reason, 'status', lr.status,
          'days', (lr.end_date::date - lr.start_date::date + 1)
        ) INTO v_request_data
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.id = NEW.reference_id;
        
      WHEN 'attendance_correction' THEN
        SELECT e.id, jsonb_build_object(
          'name_ar', e.name_ar, 'name_en', e.name_en, 'employee_code', e.employee_code,
          'position', e.position, 'department', d.name
        ) INTO v_employee_id, v_employee_data
        FROM attendance_corrections ac
        JOIN employees e ON e.id = ac.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE ac.id = NEW.reference_id;
        
        SELECT jsonb_build_object(
          'date', ac.date, 'reason', ac.reason,
          'requested_check_in', ac.requested_check_in,
          'requested_check_out', ac.requested_check_out,
          'status', ac.status
        ) INTO v_request_data
        FROM attendance_corrections ac
        WHERE ac.id = NEW.reference_id;
        
      ELSE
        SELECT e.id, jsonb_build_object(
          'name_ar', e.name_ar, 'name_en', e.name_en, 'employee_code', e.employee_code,
          'position', e.position, 'department', d.name
        ) INTO v_employee_id, v_employee_data
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.user_id = NEW.requester_user_id;
        
        SELECT jsonb_build_object(
          'request_type', ar.request_type, 'comments', ar.comments,
          'status', ar.status
        ) INTO v_request_data
        FROM approval_requests ar
        WHERE ar.id = NEW.reference_id;
    END CASE;
    
    v_request_data := COALESCE(v_request_data, '{}'::jsonb);
    v_employee_data := COALESCE(v_employee_data, '{}'::jsonb);
    
    -- Get company snapshot
    SELECT jsonb_build_object(
      'name', c.name, 'name_ar', c.name_ar, 'logo_url', c.logo_url,
      'address', c.address, 'phone', c.phone, 'email', c.email,
      'website', c.website, 'primary_color', c.primary_color,
      'header_template', c.header_template, 'footer_template', c.footer_template,
      'signatory_name', c.signatory_name, 'signatory_title', c.signatory_title,
      'stamp_url', c.stamp_url, 'registration_number', c.registration_number,
      'tax_number', c.tax_number
    ) INTO v_company_data
    FROM companies c WHERE c.id = NEW.company_id;
    
    -- Get approval history
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'action', aa.action, 'actor_name', COALESCE(p.full_name, 'مستخدم'),
      'actor_role', ur.role, 'comments', aa.comments,
      'from_status', aa.from_status, 'to_status', aa.to_status,
      'step_order', aa.step_order, 'created_at', aa.created_at,
      'has_signature', aa.signature_data IS NOT NULL
    ) ORDER BY aa.created_at), '[]'::jsonb)
    INTO v_approval_history
    FROM approval_actions aa
    LEFT JOIN profiles p ON p.user_id = aa.actor_user_id
    LEFT JOIN user_roles ur ON ur.user_id = aa.actor_user_id AND ur.scope_type = 'tenant' AND ur.tenant_id = NEW.company_id
    WHERE aa.instance_id = NEW.id;
    
    IF v_doc_id IS NOT NULL THEN
      UPDATE request_documents SET
        status = NEW.status,
        request_data = v_request_data,
        approval_history = v_approval_history,
        employee_snapshot = v_employee_data,
        company_snapshot = COALESCE(v_company_data, company_snapshot),
        updated_at = now(),
        finalized_at = CASE WHEN NEW.status IN ('approved', 'rejected', 'locked') THEN now() ELSE finalized_at END
      WHERE id = v_doc_id;
    ELSE
      v_ref_number := generate_request_reference(NEW.company_id, NEW.request_type);
      
      INSERT INTO request_documents (
        company_id, workflow_instance_id, reference_id, request_type,
        reference_number, employee_id, requester_user_id, status,
        request_data, approval_history, employee_snapshot, company_snapshot
      ) VALUES (
        NEW.company_id, NEW.id, NEW.reference_id, NEW.request_type,
        v_ref_number, v_employee_id, NEW.requester_user_id, NEW.status,
        v_request_data, v_approval_history, v_employee_data, COALESCE(v_company_data, '{}'::jsonb)
      );
    END IF;
  
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but do NOT prevent the workflow creation
    RAISE WARNING 'upsert_request_document trigger failed for instance %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;
