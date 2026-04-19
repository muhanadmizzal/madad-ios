CREATE OR REPLACE FUNCTION public.auto_generate_document_on_approval(p_instance_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_instance workflow_instances%ROWTYPE;
  v_template workflow_templates%ROWTYPE;
  v_employee RECORD;
  v_company RECORD;
  v_doc_type text;
  v_body_template text;
  v_title_template text;
  v_template_id uuid;
  v_template_source text := 'system';
  v_content text;
  v_ref_number text;
  v_next_seq int;
  v_doc_id uuid;
  v_employee_id uuid;
  v_request_data jsonb := '{}'::jsonb;
  v_sig_name text;
  v_sig_role text;
  v_sig_id uuid;
BEGIN
  SELECT * INTO v_instance FROM workflow_instances WHERE id = p_instance_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_instance.template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM workflow_templates WHERE id = v_instance.template_id;
  END IF;

  IF NOT FOUND OR NOT v_template.auto_generate_document THEN RETURN NULL; END IF;

  v_doc_type := COALESCE(v_template.target_document_type, v_instance.request_type);

  CASE v_instance.request_type
    WHEN 'leave' THEN
      SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
             d.name as department_name, e.basic_salary
      INTO v_employee
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE lr.id = v_instance.reference_id::uuid;

      SELECT jsonb_build_object(
        'leave_type', lt.name, 'start_date', lr.start_date, 'end_date', lr.end_date,
        'days', (lr.end_date - lr.start_date + 1), 'reason', lr.reason
      ) INTO v_request_data
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.id = v_instance.reference_id::uuid;

    WHEN 'attendance_correction' THEN
      SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
             d.name as department_name, e.basic_salary
      INTO v_employee
      FROM attendance_corrections ac
      JOIN employees e ON e.id = ac.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE ac.id = v_instance.reference_id::uuid;

    WHEN 'contract' THEN
      SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
             d.name as department_name, e.basic_salary
      INTO v_employee
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE c.id = v_instance.reference_id::uuid;

    ELSE
      BEGIN
        SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
               d.name as department_name, e.basic_salary
        INTO v_employee
        FROM approval_requests ar
        JOIN employees e ON e.user_id = ar.requester_id AND e.company_id = v_instance.company_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE ar.id = v_instance.reference_id::uuid;
      EXCEPTION WHEN OTHERS THEN
        SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
               d.name as department_name, e.basic_salary
        INTO v_employee
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_instance.company_id;
      END;
  END CASE;

  IF v_employee.id IS NULL THEN
    SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
           d.name as department_name, e.basic_salary
    INTO v_employee
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_instance.company_id;
  END IF;

  v_employee_id := v_employee.id;

  SELECT * INTO v_company FROM companies WHERE id = v_instance.company_id;

  -- Resolve signatory safely using separate scalar queries
  IF v_template.target_signatory_id IS NOT NULL THEN
    SELECT id, COALESCE(name_ar, name), COALESCE(role_ar, role)
    INTO v_sig_id, v_sig_name, v_sig_role
    FROM company_signatories
    WHERE id = v_template.target_signatory_id AND is_active = true;
  END IF;

  IF v_sig_id IS NULL THEN
    SELECT id, COALESCE(name_ar, name), COALESCE(role_ar, role)
    INTO v_sig_id, v_sig_name, v_sig_role
    FROM company_signatories
    WHERE company_id = v_instance.company_id AND is_active = true
    AND (allowed_document_types IS NULL OR array_length(allowed_document_types, 1) IS NULL OR v_doc_type = ANY(allowed_document_types))
    ORDER BY sort_order NULLS LAST LIMIT 1;
  END IF;

  -- Fallback to company-level signatory
  IF v_sig_name IS NULL THEN
    v_sig_name := v_company.signatory_name;
    v_sig_role := v_company.signatory_title;
  END IF;

  -- Resolve template: tenant override → system default
  SELECT id, content INTO v_template_id, v_body_template
  FROM document_templates
  WHERE company_id = v_instance.company_id AND type = v_doc_type AND (is_active IS NULL OR is_active = true)
  LIMIT 1;

  IF v_template_id IS NOT NULL THEN
    v_template_source := 'tenant';
    SELECT name INTO v_title_template FROM document_templates WHERE id = v_template_id;
  ELSE
    SELECT body_template, title_template INTO v_body_template, v_title_template
    FROM system_document_templates WHERE document_type = v_doc_type LIMIT 1;
    v_template_source := 'system';
  END IF;

  IF v_body_template IS NULL THEN
    v_body_template := 'مستند رسمي - ' || v_doc_type;
    v_title_template := v_doc_type;
  END IF;

  -- Merge placeholders
  v_content := v_body_template;
  v_content := replace(v_content, '{{company_name}}', COALESCE(v_company.name_ar, v_company.name, ''));
  v_content := replace(v_content, '{{company_address}}', COALESCE(v_company.address, ''));
  v_content := replace(v_content, '{{employee_name}}', COALESCE(v_employee.name_ar, ''));
  v_content := replace(v_content, '{{employee_position}}', COALESCE(v_employee.position, ''));
  v_content := replace(v_content, '{{employee_department}}', COALESCE(v_employee.department_name, ''));
  v_content := replace(v_content, '{{employee_id}}', COALESCE(v_employee.employee_code, ''));
  v_content := replace(v_content, '{{hire_date}}', COALESCE(v_employee.hire_date::text, ''));
  v_content := replace(v_content, '{{salary}}', COALESCE(v_employee.basic_salary::text, ''));
  v_content := replace(v_content, '{{currency}}', COALESCE(v_company.default_currency, 'IQD'));
  v_content := replace(v_content, '{{date}}', to_char(now(), 'YYYY-MM-DD'));
  v_content := replace(v_content, '{{approval_date}}', to_char(now(), 'YYYY-MM-DD'));
  v_content := replace(v_content, '{{signatory_name}}', COALESCE(v_sig_name, ''));
  v_content := replace(v_content, '{{signatory_title}}', COALESCE(v_sig_role, ''));

  IF v_request_data IS NOT NULL AND v_request_data != '{}'::jsonb THEN
    v_content := replace(v_content, '{{leave_type}}', COALESCE(v_request_data->>'leave_type', ''));
    v_content := replace(v_content, '{{leave_start}}', COALESCE(v_request_data->>'start_date', ''));
    v_content := replace(v_content, '{{leave_end}}', COALESCE(v_request_data->>'end_date', ''));
    v_content := replace(v_content, '{{leave_days}}', COALESCE(v_request_data->>'days', ''));
  END IF;

  SELECT COALESCE(MAX(
    CASE WHEN reference_number ~ '^DOC-\d{4}-\d+$'
    THEN CAST(split_part(reference_number, '-', 3) AS int)
    ELSE 0 END
  ), 0) + 1 INTO v_next_seq
  FROM generated_documents WHERE company_id = v_instance.company_id;

  v_ref_number := 'DOC-' || to_char(now(), 'YYMM') || '-' || lpad(v_next_seq::text, 4, '0');

  INSERT INTO generated_documents (
    company_id, employee_id, document_type, content, status,
    generated_by, visibility_scope, template_id, template_source,
    signatory_id, signatory_name_snapshot, signatory_role_snapshot,
    reference_number, workflow_instance_id, version, mime_type,
    approved_at, approved_by, metadata
  ) VALUES (
    v_instance.company_id, v_employee_id, v_doc_type, v_content, 'approved',
    v_instance.requester_user_id, 'employee', v_template_id, v_template_source,
    v_sig_id, v_sig_name, v_sig_role,
    v_ref_number, v_instance.id, 1, 'text/html',
    now(), (SELECT actor_user_id FROM approval_actions WHERE instance_id = p_instance_id ORDER BY created_at DESC LIMIT 1),
    jsonb_build_object('auto_generated', true, 'request_type', v_instance.request_type, 'request_data', v_request_data)
  ) RETURNING id INTO v_doc_id;

  IF v_instance.requester_user_id IS NOT NULL THEN
    INSERT INTO notifications (company_id, user_id, title, message, type, link)
    VALUES (v_instance.company_id, v_instance.requester_user_id,
      'تم إصدار مستند رسمي', 'تم إنشاء مستند رسمي لطلبك المعتمد - رقم ' || v_ref_number,
      'info', '/employee-portal/documents');
  END IF;

  INSERT INTO audit_logs (company_id, user_id, table_name, action, record_id, new_values)
  VALUES (v_instance.company_id, v_instance.requester_user_id, 'generated_documents', 'auto_generate',
    v_doc_id, jsonb_build_object('doc_type', v_doc_type, 'template_source', v_template_source,
    'signatory', v_sig_name, 'ref_number', v_ref_number));

  RETURN v_doc_id;
END;
$function$;