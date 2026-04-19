-- 1. Leave accrual configuration table
CREATE TABLE public.leave_accrual_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  accrual_method text NOT NULL DEFAULT 'yearly',
  monthly_amount numeric NOT NULL DEFAULT 0,
  carry_forward_max numeric DEFAULT 0,
  carry_forward_expiry_months integer DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, leave_type_id)
);

ALTER TABLE public.leave_accrual_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage leave accrual config" ON public.leave_accrual_config
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

CREATE POLICY "Users can view leave accrual config" ON public.leave_accrual_config
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());

-- 2. Attendance violations table
CREATE TABLE public.attendance_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  violation_type text NOT NULL DEFAULT 'late',
  minutes_diff integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance violations" ON public.attendance_violations
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

CREATE POLICY "Users can view own violations" ON public.attendance_violations
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- 3. Onboarding templates table
CREATE TABLE public.onboarding_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'preboarding',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage onboarding templates" ON public.onboarding_templates
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

CREATE POLICY "Users can view onboarding templates" ON public.onboarding_templates
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());

-- 4. Add locked_at to payroll_runs
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- 5. Add attachment_path to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS attachment_path text;

-- 6. Add grace_minutes to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS grace_minutes integer DEFAULT 10;