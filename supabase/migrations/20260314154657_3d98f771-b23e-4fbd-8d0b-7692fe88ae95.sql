
-- Employee warnings/disciplinary table
CREATE TABLE public.employee_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  warning_type text NOT NULL DEFAULT 'verbal',
  severity text NOT NULL DEFAULT 'minor',
  subject text NOT NULL,
  description text,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  issued_by uuid,
  action_taken text,
  employee_response text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warnings" ON public.employee_warnings
FOR ALL TO authenticated
USING (
  (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
);

CREATE POLICY "Users can view own warnings" ON public.employee_warnings
FOR SELECT TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);
