
-- Payroll policies table
CREATE TABLE public.payroll_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'السياسة الافتراضية',
  is_default boolean DEFAULT true,
  salary_basis text NOT NULL DEFAULT 'monthly_30', -- monthly_30, monthly_calendar, monthly_working
  standard_hours_per_day numeric DEFAULT 8,
  absence_deduction_enabled boolean DEFAULT true,
  unpaid_leave_deduction_enabled boolean DEFAULT true,
  late_deduction_enabled boolean DEFAULT true,
  late_deduction_type text DEFAULT 'per_minute', -- per_minute, per_incident, tiered
  late_deduction_rate numeric DEFAULT 0, -- amount per minute or per incident
  late_grace_minutes integer DEFAULT 10,
  early_leave_deduction_enabled boolean DEFAULT false,
  early_leave_deduction_rate numeric DEFAULT 0,
  overtime_enabled boolean DEFAULT true,
  overtime_multiplier numeric DEFAULT 1.5,
  holiday_work_multiplier numeric DEFAULT 2.0,
  weekend_work_multiplier numeric DEFAULT 1.5,
  proration_enabled boolean DEFAULT true,
  proration_basis text DEFAULT 'calendar_days', -- calendar_days, working_days
  social_security_employee_pct numeric DEFAULT 5.0,
  social_security_employer_pct numeric DEFAULT 12.0,
  income_tax_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payroll_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for payroll_policies" ON public.payroll_policies
  FOR ALL USING (company_id = public.get_my_company_id());

-- Payroll attendance summary per employee per run
CREATE TABLE public.payroll_attendance_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scheduled_days integer DEFAULT 0,
  worked_days integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  paid_leave_days numeric DEFAULT 0,
  unpaid_leave_days numeric DEFAULT 0,
  late_minutes integer DEFAULT 0,
  late_incidents integer DEFAULT 0,
  early_leave_minutes integer DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  weekend_worked_hours numeric DEFAULT 0,
  holiday_worked_hours numeric DEFAULT 0,
  daily_rate numeric DEFAULT 0,
  hourly_rate numeric DEFAULT 0,
  absence_deduction numeric DEFAULT 0,
  unpaid_leave_deduction numeric DEFAULT 0,
  late_deduction numeric DEFAULT 0,
  early_leave_deduction numeric DEFAULT 0,
  overtime_pay numeric DEFAULT 0,
  weekend_pay numeric DEFAULT 0,
  holiday_pay numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);

ALTER TABLE public.payroll_attendance_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for payroll_attendance_summary" ON public.payroll_attendance_summary
  FOR ALL USING (company_id = public.get_my_company_id());

-- Add overtime_pay, absence_deduction, late_deduction columns to payroll_items
ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS overtime_pay numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holiday_weekend_pay numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS absence_deduction numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_deduction numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_leave_deduction numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS policy_id uuid REFERENCES public.payroll_policies(id);
