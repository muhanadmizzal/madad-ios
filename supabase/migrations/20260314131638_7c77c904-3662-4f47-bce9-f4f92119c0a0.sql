
-- Leave balances table for accrual tracking
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  entitled_days numeric NOT NULL DEFAULT 0,
  used_days numeric NOT NULL DEFAULT 0,
  carried_days numeric NOT NULL DEFAULT 0,
  remaining_days numeric GENERATED ALWAYS AS (entitled_days + carried_days - used_days) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company leave balances" ON public.leave_balances
FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage leave balances" ON public.leave_balances
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

-- Attendance corrections table
CREATE TABLE public.attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  date date NOT NULL,
  requested_check_in timestamptz,
  requested_check_out timestamptz,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company corrections" ON public.attendance_corrections
FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert corrections" ON public.attendance_corrections
FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update corrections" ON public.attendance_corrections
FOR UPDATE TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));
