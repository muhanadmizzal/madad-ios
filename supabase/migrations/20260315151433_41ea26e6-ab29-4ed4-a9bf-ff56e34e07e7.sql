
-- Expand payroll_policies with all unified work-rule fields
ALTER TABLE public.payroll_policies
  ADD COLUMN IF NOT EXISTS working_days jsonb DEFAULT '["sun","mon","tue","wed","thu"]'::jsonb,
  ADD COLUMN IF NOT EXISTS weekend_days jsonb DEFAULT '["fri","sat"]'::jsonb,
  ADD COLUMN IF NOT EXISTS working_hours_start time DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS working_hours_end time DEFAULT '16:00',
  ADD COLUMN IF NOT EXISTS holiday_source text DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS absence_definition text DEFAULT 'no_attendance_no_leave',
  ADD COLUMN IF NOT EXISTS overtime_threshold_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_rounding text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS leave_impact_rules jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hourly_rate_basis text DEFAULT 'daily_divided',
  ADD COLUMN IF NOT EXISTS tax_mode text DEFAULT 'iraqi_brackets',
  ADD COLUMN IF NOT EXISTS custom_deduction_logic jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS loan_deduction_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS payslip_show_attendance boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS payslip_show_overtime boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS payslip_show_leave boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS payslip_custom_labels jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payslip_language text DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS description text;

-- Policy assignments table for multi-profile support
CREATE TABLE IF NOT EXISTS public.policy_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.payroll_policies(id) ON DELETE CASCADE,
  assignment_type text NOT NULL DEFAULT 'employee',
  assignment_target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(policy_id, assignment_type, assignment_target_id)
);

ALTER TABLE public.policy_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage policy assignments"
  ON public.policy_assignments FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

CREATE POLICY "Users can view policy assignments"
  ON public.policy_assignments FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());
