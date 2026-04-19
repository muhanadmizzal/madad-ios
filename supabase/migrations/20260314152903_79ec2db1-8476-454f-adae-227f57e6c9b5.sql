
-- Loan payments tracking table
CREATE TABLE public.loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'payroll_deduction',
  payroll_run_id UUID REFERENCES public.payroll_runs(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loan payments" ON public.loan_payments
FOR ALL TO authenticated
USING (
  loan_id IN (SELECT id FROM public.loans WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can view loan payments" ON public.loan_payments
FOR SELECT TO authenticated
USING (
  loan_id IN (SELECT id FROM public.loans WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Add department targeting to announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_department_id UUID REFERENCES public.departments(id) DEFAULT NULL;

-- Add location to attendance records
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;

-- Add working hours config to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '08:00';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '16:00';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS overtime_multiplier NUMERIC DEFAULT 1.5;

-- Add AI onboarding action prompt
-- (no schema needed, handled in edge function)
