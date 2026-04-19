
CREATE OR REPLACE FUNCTION public.create_default_workflows(p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template_id uuid;
BEGIN
  -- Leave Request Workflow (auto-generates leave approval document)
  INSERT INTO workflow_templates (company_id, name, request_type, is_active, auto_generate_document, target_document_type)
  VALUES (p_company_id, 'سير عمل الإجازات', 'leave', true, true, 'leave_approval')
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'موافقة المدير المباشر', 'manager', 24),
    (v_template_id, 2, 'تأكيد الموارد البشرية', 'hr_manager', 48);

  -- Certificate Request Workflow (generic fallback)
  INSERT INTO workflow_templates (company_id, name, request_type, is_active, auto_generate_document, target_document_type)
  VALUES (p_company_id, 'سير عمل الشهادات', 'certificate', true, true, 'certificate')
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة الموارد البشرية', 'hr_manager', 24);

  -- Attendance Correction Workflow
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل تصحيح الحضور', 'attendance_correction', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'موافقة المدير المباشر', 'manager', 24),
    (v_template_id, 2, 'مراجعة HR', 'hr_officer', 48);

  -- Payroll Approval Workflow
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل الرواتب', 'payroll', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة الموارد البشرية', 'hr_manager', 24),
    (v_template_id, 2, 'اعتماد المدير العام', 'admin', 48);

  -- Contract Approval Workflow
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل العقود', 'contract', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة الموارد البشرية', 'hr_manager', 48),
    (v_template_id, 2, 'اعتماد الإدارة', 'admin', 72);

  -- Onboarding Workflow
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل التهيئة', 'onboarding', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'تأكيد الموارد البشرية', 'hr_officer', 48);

  -- Final Settlement Workflow
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل التسوية النهائية', 'final_settlement', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة الموارد البشرية', 'hr_manager', 48),
    (v_template_id, 2, 'اعتماد المالية', 'admin', 72);

  -- Document Upload Approval
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل المستندات', 'document', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة الموارد البشرية', 'hr_officer', 48);

  -- General HR Request Workflow
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل الطلبات العامة', 'general', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة الموارد البشرية', 'hr_manager', 48);

  -- Certificate sub-types (auto-generate branded documents)
  INSERT INTO workflow_templates (company_id, name, request_type, is_active, auto_generate_document, target_document_type)
  VALUES (p_company_id, 'شهادة خبرة', 'certificate_experience', true, true, 'certificate_experience')
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة HR', 'hr_manager', 24);

  INSERT INTO workflow_templates (company_id, name, request_type, is_active, auto_generate_document, target_document_type)
  VALUES (p_company_id, 'شهادة راتب', 'certificate_salary', true, true, 'certificate_salary')
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة HR', 'hr_manager', 24);

  INSERT INTO workflow_templates (company_id, name, request_type, is_active, auto_generate_document, target_document_type)
  VALUES (p_company_id, 'شهادة تعريف بالعمل', 'certificate_employment', true, true, 'certificate_employment')
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة HR', 'hr_manager', 24);
END;
$function$;
