
-- 1. Add auto-generate-document config to workflow_templates
ALTER TABLE public.workflow_templates 
  ADD COLUMN IF NOT EXISTS auto_generate_document boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_document_type text,
  ADD COLUMN IF NOT EXISTS target_signatory_id uuid REFERENCES public.company_signatories(id) ON DELETE SET NULL;

-- 2. Add signatory snapshot and template source to generated_documents
ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS signatory_id uuid REFERENCES public.company_signatories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signatory_name_snapshot text,
  ADD COLUMN IF NOT EXISTS signatory_role_snapshot text,
  ADD COLUMN IF NOT EXISTS template_source text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS reference_number text;

-- 3. Create unique index for reference_number per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_documents_ref_number 
  ON public.generated_documents (company_id, reference_number) 
  WHERE reference_number IS NOT NULL;

-- 4. Auto-generate document on approval function
CREATE OR REPLACE FUNCTION public.auto_generate_document_on_approval(p_instance_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_instance workflow_instances%ROWTYPE;
  v_template workflow_templates%ROWTYPE;
  v_employee RECORD;
  v_company RECORD;
  v_signatory RECORD;
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
BEGIN
  -- Get instance
  SELECT * INTO v_instance FROM workflow_instances WHERE id = p_instance_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Get workflow template
  IF v_instance.template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM workflow_templates WHERE id = v_instance.template_id;
  END IF;

  -- Check if auto-generate is enabled
  IF NOT FOUND OR NOT v_template.auto_generate_document THEN RETURN NULL; END IF;

  v_doc_type := COALESCE(v_template.target_document_type, v_instance.request_type);

  -- Resolve employee from reference
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
        'days', lr.days_count, 'reason', lr.reason
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
      -- For certificate and other types, try approval_requests
      BEGIN
        SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
               d.name as department_name, e.basic_salary
        INTO v_employee
        FROM approval_requests ar
        JOIN profiles p ON p.user_id = ar.requester_id
        JOIN employees e ON e.user_id = ar.requester_id AND e.company_id = v_instance.company_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE ar.id = v_instance.reference_id::uuid;
      EXCEPTION WHEN OTHERS THEN
        -- Try employees via requester
        SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
               d.name as department_name, e.basic_salary
        INTO v_employee
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_instance.company_id;
      END;
  END CASE;

  IF v_employee.id IS NULL THEN
    -- Last resort: find employee by requester
    SELECT e.id, e.name_ar, e.employee_code, e.hire_date, e.position,
           d.name as department_name, e.basic_salary
    INTO v_employee
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_instance.company_id;
  END IF;

  v_employee_id := v_employee.id;

  -- Get company
  SELECT * INTO v_company FROM companies WHERE id = v_instance.company_id;

  -- Resolve signatory
  IF v_template.target_signatory_id IS NOT NULL THEN
    SELECT * INTO v_signatory FROM company_signatories WHERE id = v_template.target_signatory_id AND is_active = true;
  END IF;
  IF NOT FOUND OR v_signatory.id IS NULL THEN
    -- Fallback: first active signatory that allows this doc type
    SELECT * INTO v_signatory FROM company_signatories
    WHERE company_id = v_instance.company_id AND is_active = true
    AND (allowed_document_types IS NULL OR array_length(allowed_document_types, 1) IS NULL OR v_doc_type = ANY(allowed_document_types))
    ORDER BY sort_order NULLS LAST LIMIT 1;
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

  -- Fallback if no template found at all
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
  v_content := replace(v_content, '{{signatory_name}}', COALESCE(v_signatory.name_ar, v_signatory.name, v_company.signatory_name, ''));
  v_content := replace(v_content, '{{signatory_title}}', COALESCE(v_signatory.role_ar, v_signatory.role, v_company.signatory_title, ''));

  -- Leave-specific placeholders
  IF v_request_data IS NOT NULL AND v_request_data != '{}'::jsonb THEN
    v_content := replace(v_content, '{{leave_type}}', COALESCE(v_request_data->>'leave_type', ''));
    v_content := replace(v_content, '{{leave_start}}', COALESCE(v_request_data->>'start_date', ''));
    v_content := replace(v_content, '{{leave_end}}', COALESCE(v_request_data->>'end_date', ''));
    v_content := replace(v_content, '{{leave_days}}', COALESCE(v_request_data->>'days', ''));
  END IF;

  -- Generate reference number: DOC-YYMM-NNNN
  SELECT COALESCE(MAX(
    CASE WHEN reference_number ~ '^DOC-\d{4}-\d+$'
    THEN CAST(split_part(reference_number, '-', 3) AS int)
    ELSE 0 END
  ), 0) + 1 INTO v_next_seq
  FROM generated_documents WHERE company_id = v_instance.company_id;

  v_ref_number := 'DOC-' || to_char(now(), 'YYMM') || '-' || lpad(v_next_seq::text, 4, '0');

  -- Insert generated document
  INSERT INTO generated_documents (
    company_id, employee_id, document_type, content, status,
    generated_by, visibility_scope, template_id, template_source,
    signatory_id, signatory_name_snapshot, signatory_role_snapshot,
    reference_number, workflow_instance_id, version, mime_type,
    approved_at, approved_by, metadata
  ) VALUES (
    v_instance.company_id, v_employee_id, v_doc_type, v_content, 'approved',
    v_instance.requester_user_id, 'employee', v_template_id, v_template_source,
    v_signatory.id, COALESCE(v_signatory.name_ar, v_signatory.name),
    COALESCE(v_signatory.role_ar, v_signatory.role),
    v_ref_number, v_instance.id, 1, 'text/html',
    now(), (SELECT actor_user_id FROM approval_actions WHERE instance_id = p_instance_id ORDER BY created_at DESC LIMIT 1),
    jsonb_build_object('auto_generated', true, 'request_type', v_instance.request_type, 'request_data', v_request_data)
  ) RETURNING id INTO v_doc_id;

  -- Notify employee
  IF v_instance.requester_user_id IS NOT NULL THEN
    INSERT INTO notifications (company_id, user_id, title, message, type, link)
    VALUES (v_instance.company_id, v_instance.requester_user_id,
      'تم إصدار مستند رسمي', 'تم إنشاء مستند رسمي لطلبك المعتمد - رقم ' || v_ref_number,
      'info', '/employee-portal/documents');
  END IF;

  -- Audit log
  INSERT INTO audit_logs (company_id, user_id, table_name, action, record_id, new_values)
  VALUES (v_instance.company_id, v_instance.requester_user_id, 'generated_documents', 'auto_generate',
    v_doc_id, jsonb_build_object('doc_type', v_doc_type, 'template_source', v_template_source,
    'signatory', COALESCE(v_signatory.name_ar, v_signatory.name), 'ref_number', v_ref_number));

  RETURN v_doc_id;
END;
$$;

-- 5. Update process_approval_action to call auto_generate after approval
CREATE OR REPLACE FUNCTION public.process_approval_action(p_instance_id uuid, p_action text, p_comments text DEFAULT NULL::text, p_signature_data text DEFAULT NULL::text)
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

  -- TENANT ISOLATION
  SELECT company_id INTO v_actor_company_id FROM profiles WHERE user_id = v_actor_id;
  IF v_actor_company_id IS NULL OR v_actor_company_id != v_company_id THEN
    RAISE EXCEPTION 'Cross-tenant action not allowed';
  END IF;

  -- SELF-APPROVAL PREVENTION
  IF v_instance.requester_user_id = v_actor_id AND p_action IN ('approve', 'reject', 'escalate', 'lock') THEN
    RAISE EXCEPTION 'Cannot approve or reject your own request';
  END IF;

  -- ROLE CHECK
  IF p_action IN ('approve', 'reject', 'escalate', 'lock', 'return') THEN
    IF NOT (has_role(v_actor_id, 'admin') OR has_role(v_actor_id, 'tenant_admin') 
            OR has_role(v_actor_id, 'hr_manager') OR has_role(v_actor_id, 'hr_officer')
            OR has_role(v_actor_id, 'manager')) THEN
      RAISE EXCEPTION 'Insufficient role to perform this action';
    END IF;
  END IF;

  -- MANAGER SCOPE CHECK
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

  -- Determine new status
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

  -- Insert approval action
  INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, comments, signature_data)
  VALUES (p_instance_id, v_company_id, v_actor_id, p_action, v_from_status, v_to_status, v_step_order, p_comments, p_signature_data);

  -- Update instance
  UPDATE workflow_instances SET
    status = v_to_status,
    current_step_order = COALESCE(v_next_step, current_step_order),
    is_escalated = CASE WHEN p_action = 'escalate' THEN true ELSE is_escalated END,
    approved_at = CASE WHEN v_to_status = 'approved' THEN now() ELSE approved_at END,
    rejected_at = CASE WHEN v_to_status = 'rejected' THEN now() ELSE rejected_at END,
    final_comments = COALESCE(p_comments, final_comments),
    updated_at = now()
  WHERE id = p_instance_id;

  -- Store digital signature
  IF p_signature_data IS NOT NULL THEN
    INSERT INTO digital_signatures (company_id, user_id, document_id, document_type, signature_data, signature_type)
    VALUES (v_company_id, v_actor_id, p_instance_id, 'approval', p_signature_data, 'drawn');
  END IF;

  -- SOURCE TABLE SYNC
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
    -- Sync approval_requests for certificate types
    IF v_instance.request_type LIKE 'certificate%' THEN
      UPDATE approval_requests SET status =
        CASE v_to_status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'returned' THEN 'pending' ELSE status END,
        approved_by = CASE WHEN v_to_status = 'approved' THEN v_actor_id ELSE approved_by END,
        updated_at = now()
      WHERE id = v_instance.reference_id::uuid;
    END IF;
  END IF;

  -- AUTO-GENERATE DOCUMENT ON APPROVAL
  IF v_to_status = 'approved' THEN
    BEGIN
      v_generated_doc_id := auto_generate_document_on_approval(p_instance_id);
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail the approval
      INSERT INTO audit_logs (company_id, user_id, table_name, action, record_id, new_values)
      VALUES (v_company_id, v_actor_id, 'generated_documents', 'auto_generate_failed', p_instance_id,
        jsonb_build_object('error', SQLERRM));
    END;
  END IF;

  -- Notification for next step approvers
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

  -- Notification for requester
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

-- 6. Set auto_generate_document = true for certificate workflows
UPDATE workflow_templates SET auto_generate_document = true, target_document_type = 'certificate_employment'
WHERE request_type = 'certificate_employment';

UPDATE workflow_templates SET auto_generate_document = true, target_document_type = 'certificate_salary'
WHERE request_type = 'certificate_salary';

UPDATE workflow_templates SET auto_generate_document = true, target_document_type = 'certificate_experience'
WHERE request_type = 'certificate_experience';

UPDATE workflow_templates SET auto_generate_document = true, target_document_type = 'certificate'
WHERE request_type = 'certificate' AND auto_generate_document = false;

-- 7. RLS for generated_documents: employees see their own released docs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'employee_view_own_generated_docs' AND tablename = 'generated_documents') THEN
    CREATE POLICY employee_view_own_generated_docs ON generated_documents
      FOR SELECT TO authenticated
      USING (
        company_id = get_my_company_id()
        AND (
          -- HR/admin see all
          has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') 
          OR has_role(auth.uid(), 'hr_manager') OR has_role(auth.uid(), 'hr_officer')
          -- Employee sees own docs with employee visibility
          OR (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) 
              AND visibility_scope IN ('employee', 'all')
              AND status IN ('approved', 'final', 'signed', 'released'))
        )
      );
  END IF;
END $$;
