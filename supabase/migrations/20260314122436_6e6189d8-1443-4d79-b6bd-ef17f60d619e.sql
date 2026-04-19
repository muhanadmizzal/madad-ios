
-- =====================================================
-- TAMKEEN HR - FULL FEATURE DATABASE SCHEMA
-- =====================================================

-- 1. BRANCHES / SITES
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  manager_name TEXT,
  is_headquarters BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view company branches" ON public.branches FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 2. POSITIONS / JOB GRADES
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  grade_level INTEGER,
  min_salary NUMERIC DEFAULT 0,
  max_salary NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view positions" ON public.positions FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage positions" ON public.positions FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 3. EMPLOYEE EMERGENCY CONTACTS
CREATE TABLE public.employee_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view emergency contacts" ON public.employee_emergency_contacts FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Admins can manage emergency contacts" ON public.employee_emergency_contacts FOR ALL TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND has_role(auth.uid(), 'admin'));

-- 4. EMPLOYEE DEPENDENTS
CREATE TABLE public.employee_dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  date_of_birth DATE,
  national_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_dependents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view dependents" ON public.employee_dependents FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Admins can manage dependents" ON public.employee_dependents FOR ALL TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND has_role(auth.uid(), 'admin'));

-- 5. EMPLOYEE ASSETS
CREATE TABLE public.employee_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  serial_number TEXT,
  assigned_date DATE DEFAULT CURRENT_DATE,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view assets" ON public.employee_assets FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage assets" ON public.employee_assets FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 6. EMPLOYEE NOTES (internal HR notes)
CREATE TABLE public.employee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view notes" ON public.employee_notes FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));
CREATE POLICY "Admins can manage notes" ON public.employee_notes FOR ALL TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 7. CONTRACTS
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL DEFAULT 'permanent',
  start_date DATE NOT NULL,
  end_date DATE,
  salary NUMERIC DEFAULT 0,
  probation_end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  file_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view contracts" ON public.contracts FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage contracts" ON public.contracts FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 8. SHIFTS
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60,
  is_night_shift BOOLEAN DEFAULT false,
  grace_minutes INTEGER DEFAULT 15,
  overtime_threshold_hours NUMERIC DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view shifts" ON public.shifts FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage shifts" ON public.shifts FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 9. SHIFT ASSIGNMENTS
CREATE TABLE public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view shift assignments" ON public.shift_assignments FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Admins can manage shift assignments" ON public.shift_assignments FOR ALL TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND has_role(auth.uid(), 'admin'));

-- 10. PUBLIC HOLIDAYS
CREATE TABLE public.public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  region TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view holidays" ON public.public_holidays FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage holidays" ON public.public_holidays FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 11. SALARY COMPONENTS (allowance/deduction engine)
CREATE TABLE public.salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'allowance',
  calculation_type TEXT NOT NULL DEFAULT 'fixed',
  amount NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view salary components" ON public.salary_components FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage salary components" ON public.salary_components FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 12. EMPLOYEE SALARY COMPONENTS (per-employee overrides)
CREATE TABLE public.employee_salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  salary_component_id UUID NOT NULL REFERENCES public.salary_components(id) ON DELETE CASCADE,
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_salary_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view emp salary components" ON public.employee_salary_components FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Admins can manage emp salary components" ON public.employee_salary_components FOR ALL TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND has_role(auth.uid(), 'admin'));

-- 13. LOANS / ADVANCES
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL DEFAULT 'advance',
  amount NUMERIC NOT NULL,
  monthly_deduction NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view loans" ON public.loans FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage loans" ON public.loans FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 14. AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- 15. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND user_id IS NULL));
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 16. DOCUMENT TEMPLATES
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'letter',
  content TEXT NOT NULL,
  merge_fields TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view templates" ON public.document_templates FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage templates" ON public.document_templates FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 17. RECRUITMENT JOBS
CREATE TABLE public.recruitment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  branch_id UUID REFERENCES public.branches(id),
  description TEXT,
  requirements TEXT,
  employment_type TEXT DEFAULT 'full_time',
  salary_range_min NUMERIC,
  salary_range_max NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  positions_count INTEGER DEFAULT 1,
  closing_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recruitment_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view jobs" ON public.recruitment_jobs FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage jobs" ON public.recruitment_jobs FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 18. CANDIDATES
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  resume_path TEXT,
  source TEXT DEFAULT 'direct',
  stage TEXT NOT NULL DEFAULT 'applied',
  rating INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view candidates" ON public.candidates FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage candidates" ON public.candidates FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 19. ONBOARDING TASKS
CREATE TABLE public.onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'preboarding',
  assigned_to UUID,
  is_completed BOOLEAN DEFAULT false,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view onboarding tasks" ON public.onboarding_tasks FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage onboarding tasks" ON public.onboarding_tasks FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 20. EXIT CLEARANCE
CREATE TABLE public.exit_clearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  resignation_date DATE,
  last_working_date DATE,
  exit_type TEXT DEFAULT 'resignation',
  status TEXT NOT NULL DEFAULT 'pending',
  assets_returned BOOLEAN DEFAULT false,
  final_settlement_amount NUMERIC DEFAULT 0,
  exit_interview_notes TEXT,
  notice_period_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exit_clearance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view exit clearance" ON public.exit_clearance FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage exit clearance" ON public.exit_clearance FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 21. GOALS
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  progress INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  cycle TEXT DEFAULT '2026',
  weight NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view goals" ON public.goals FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage goals" ON public.goals FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 22. APPRAISALS
CREATE TABLE public.appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reviewer_id UUID,
  cycle TEXT NOT NULL,
  appraisal_type TEXT DEFAULT 'annual',
  overall_rating INTEGER,
  strengths TEXT,
  improvements TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view appraisals" ON public.appraisals FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage appraisals" ON public.appraisals FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 23. TRAINING COURSES
CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  trainer TEXT,
  course_type TEXT DEFAULT 'internal',
  duration_hours NUMERIC DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  max_participants INTEGER,
  cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view courses" ON public.training_courses FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage courses" ON public.training_courses FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 24. TRAINING ENROLLMENTS
CREATE TABLE public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enrolled',
  completion_date DATE,
  score NUMERIC,
  certificate_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view enrollments" ON public.training_enrollments FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Admins can manage enrollments" ON public.training_enrollments FOR ALL TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 25. ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,
  published_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view announcements" ON public.announcements FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 26. APPROVAL WORKFLOWS
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  requester_id UUID,
  record_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  rejected_by UUID,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view approval requests" ON public.approval_requests FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert approval requests" ON public.approval_requests FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can update approval requests" ON public.approval_requests FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- 27. CUSTOM FIELDS
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'employee',
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  options JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view custom fields" ON public.custom_fields FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage custom fields" ON public.custom_fields FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 28. CUSTOM FIELD VALUES
CREATE TABLE public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  record_id UUID NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view field values" ON public.custom_field_values FOR SELECT TO authenticated USING (custom_field_id IN (SELECT id FROM custom_fields WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Admins can manage field values" ON public.custom_field_values FOR ALL TO authenticated USING (custom_field_id IN (SELECT id FROM custom_fields WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- Add branch_id and employee_code to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'permanent';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'عراقي';

-- Add branch_id to departments
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Employee code generator function
CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(employee_code, '[^0-9]', '', 'g'), '') AS INTEGER)), 0) + 1
  INTO next_num
  FROM employees
  WHERE company_id = NEW.company_id;
  
  NEW.employee_code := 'EMP-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_employee_code
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  WHEN (NEW.employee_code IS NULL)
  EXECUTE FUNCTION public.generate_employee_code();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
