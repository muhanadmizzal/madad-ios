
-- =============================================
-- 1. COMPANY SIGNATORIES TABLE
-- =============================================
CREATE TABLE public.company_signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  role TEXT NOT NULL,
  role_ar TEXT,
  signature_url TEXT,
  stamp_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allowed_document_types TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_signatories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view signatories"
  ON public.company_signatories FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Admins can manage signatories"
  ON public.company_signatories FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'tenant_admin') OR
    public.has_role(auth.uid(), 'hr_manager')
  ))
  WITH CHECK (company_id = public.get_my_company_id() AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'tenant_admin') OR
    public.has_role(auth.uid(), 'hr_manager')
  ));

-- =============================================
-- 2. DEFAULT DOCUMENT TEMPLATES (system-level)
-- =============================================
CREATE TABLE IF NOT EXISTS public.system_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  title_template TEXT,
  body_template TEXT NOT NULL,
  footer_template TEXT,
  language TEXT DEFAULT 'ar',
  merge_fields TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert system default templates
INSERT INTO public.system_document_templates (document_type, name, name_ar, title_template, body_template, footer_template, merge_fields) VALUES
(
  'certificate_employment',
  'Certificate of Employment',
  'شهادة تعريف بالعمل',
  'شهادة تعريف بالعمل',
  'نشهد نحن {{company_name}} بأن السيد/ة {{employee_name}} يعمل/تعمل لدينا بوظيفة {{employee_position}} في قسم {{employee_department}} وذلك اعتباراً من تاريخ {{hire_date}}.

أُعطيت هذه الشهادة بناءً على طلبه/ا دون أدنى مسؤولية على الشركة.',
  'هذه الشهادة صادرة من النظام الإلكتروني ولا تحتاج إلى توقيع يدوي.',
  ARRAY['{{company_name}}','{{employee_name}}','{{employee_position}}','{{employee_department}}','{{hire_date}}','{{date}}','{{signatory_name}}','{{signatory_title}}']
),
(
  'certificate_salary',
  'Salary Certificate',
  'شهادة راتب',
  'شهادة راتب',
  'نشهد نحن {{company_name}} بأن السيد/ة {{employee_name}} الذي يعمل بوظيفة {{employee_position}} يتقاضى راتباً شهرياً قدره {{salary}} {{currency}}.

أُعطيت هذه الشهادة بناءً على طلبه/ا لاستخدامها فيما يلزم.',
  'هذه الشهادة صادرة من النظام الإلكتروني ولا تحتاج إلى توقيع يدوي.',
  ARRAY['{{company_name}}','{{employee_name}}','{{employee_position}}','{{salary}}','{{currency}}','{{date}}','{{signatory_name}}']
),
(
  'certificate_experience',
  'Experience Certificate',
  'شهادة خبرة',
  'شهادة خبرة',
  'نشهد نحن {{company_name}} بأن السيد/ة {{employee_name}} قد عمل/ت لدينا بوظيفة {{employee_position}} في قسم {{employee_department}} خلال الفترة من {{hire_date}} وحتى {{end_date}}.

خلال فترة عمله/ا أظهر/ت كفاءة والتزاماً في أداء المهام الموكلة إليه/ا.

أُعطيت هذه الشهادة بناءً على طلبه/ا.',
  'هذه الشهادة صادرة من النظام الإلكتروني.',
  ARRAY['{{company_name}}','{{employee_name}}','{{employee_position}}','{{employee_department}}','{{hire_date}}','{{end_date}}','{{date}}','{{signatory_name}}']
),
(
  'leave_approval',
  'Leave Approval Letter',
  'خطاب الموافقة على الإجازة',
  'الموافقة على طلب إجازة',
  'تم الموافقة على طلب الإجازة المقدم من السيد/ة {{employee_name}} ({{employee_position}} - قسم {{employee_department}}).

نوع الإجازة: {{leave_type}}
من تاريخ: {{leave_start}}
إلى تاريخ: {{leave_end}}
عدد الأيام: {{leave_days}}

تمت الموافقة بتاريخ: {{approval_date}}',
  '',
  ARRAY['{{employee_name}}','{{employee_position}}','{{employee_department}}','{{leave_type}}','{{leave_start}}','{{leave_end}}','{{leave_days}}','{{approval_date}}','{{signatory_name}}']
),
(
  'warning_letter',
  'Warning Letter',
  'خطاب إنذار',
  'خطاب إنذار',
  'السيد/ة {{employee_name}} - {{employee_position}}

الموضوع: إنذار

نحيطكم علماً بأنه تم رصد مخالفة بتاريخ {{incident_date}}.

تفاصيل المخالفة: {{violation_details}}

نأمل الالتزام بقوانين وأنظمة العمل المعمول بها وعدم تكرار ذلك مستقبلاً.',
  '',
  ARRAY['{{employee_name}}','{{employee_position}}','{{incident_date}}','{{violation_details}}','{{date}}','{{signatory_name}}']
),
(
  'offer_letter',
  'Offer Letter',
  'خطاب عرض عمل',
  'عرض عمل',
  'السيد/ة {{candidate_name}}

يسرنا في {{company_name}} أن نقدم لكم عرض العمل التالي:

المسمى الوظيفي: {{position}}
القسم: {{department}}
الراتب الشهري: {{salary}} {{currency}}
تاريخ المباشرة: {{start_date}}

نأمل قبولكم لهذا العرض.',
  '',
  ARRAY['{{candidate_name}}','{{company_name}}','{{position}}','{{department}}','{{salary}}','{{currency}}','{{start_date}}','{{signatory_name}}']
);

-- =============================================
-- 3. DEFAULT WORKFLOW CREATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.create_default_workflows(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template_id uuid;
BEGIN
  -- Leave Request Workflow
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل الإجازات', 'leave', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'موافقة المدير المباشر', 'manager', 24),
    (v_template_id, 2, 'تأكيد الموارد البشرية', 'hr_manager', 48);

  -- Certificate Request Workflow
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'سير عمل الشهادات', 'certificate', true)
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

  -- Certificate sub-types
  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'شهادة خبرة', 'certificate_experience', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة HR', 'hr_manager', 24);

  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'شهادة راتب', 'certificate_salary', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة HR', 'hr_manager', 24);

  INSERT INTO workflow_templates (company_id, name, request_type, is_active)
  VALUES (p_company_id, 'شهادة تعريف بالعمل', 'certificate_employment', true)
  RETURNING id INTO v_template_id;
  INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours) VALUES
    (v_template_id, 1, 'مراجعة HR', 'hr_manager', 24);
END;
$$;

-- =============================================
-- 4. UPDATE handle_new_user TO SEED WORKFLOWS
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO public.companies (name, email, phone, sector, employee_count_range)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'شركتي'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'sector', 'private'),
    COALESCE(NEW.raw_user_meta_data->>'employee_count_range', NULL)
  )
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (user_id, company_id, full_name)
  VALUES (NEW.id, new_company_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role, scope_type, tenant_id)
  VALUES (NEW.id, 'admin', 'tenant', new_company_id);

  PERFORM public.create_default_leave_types(new_company_id);
  PERFORM public.create_default_workflows(new_company_id);

  RETURN NEW;
END;
$$;

-- =============================================
-- 5. RLS for system_document_templates (read-only for all authenticated)
-- =============================================
ALTER TABLE public.system_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read system templates"
  ON public.system_document_templates FOR SELECT TO authenticated
  USING (true);
