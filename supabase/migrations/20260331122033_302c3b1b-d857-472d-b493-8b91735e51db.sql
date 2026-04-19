
-- Salary equations: company-level defaults and per-employee overrides
CREATE TABLE public.salary_equations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'المعادلة الافتراضية',
  is_default BOOLEAN NOT NULL DEFAULT false,
  formula JSONB NOT NULL DEFAULT '[]'::jsonb,
  projection_years INT NOT NULL DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id)
);

-- RLS
ALTER TABLE public.salary_equations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view salary equations" ON public.salary_equations
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage salary equations" ON public.salary_equations
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Index
CREATE INDEX idx_salary_equations_company ON public.salary_equations(company_id);
CREATE INDEX idx_salary_equations_employee ON public.salary_equations(employee_id);
