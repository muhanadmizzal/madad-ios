
-- ============================================================
-- 1. SALARY GRADES TABLE
-- ============================================================
CREATE TABLE public.salary_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  grade_name TEXT NOT NULL,
  grade_level INTEGER NOT NULL DEFAULT 1,
  min_salary NUMERIC NOT NULL DEFAULT 0,
  max_salary NUMERIC NOT NULL DEFAULT 0,
  annual_increment NUMERIC DEFAULT 0,
  increment_percentage NUMERIC DEFAULT 0,
  years_to_next_grade INTEGER DEFAULT 5,
  next_grade_id UUID REFERENCES public.salary_grades(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view salary grades" ON public.salary_grades FOR SELECT TO authenticated USING (company_id = public.get_my_company_id());
CREATE POLICY "Admin can manage salary grades" ON public.salary_grades FOR ALL TO authenticated USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- ============================================================
-- 2. EMPLOYEE PRAISE / REWARDS TABLE
-- ============================================================
CREATE TABLE public.employee_praise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  praise_type TEXT NOT NULL DEFAULT 'commendation',
  category TEXT DEFAULT 'performance',
  subject TEXT NOT NULL,
  description TEXT,
  reward_amount NUMERIC DEFAULT 0,
  affects_payroll BOOLEAN DEFAULT false,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by UUID,
  status TEXT NOT NULL DEFAULT 'active',
  auto_generate_document BOOLEAN DEFAULT false,
  generated_document_id UUID REFERENCES public.generated_documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_praise ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own company praise" ON public.employee_praise FOR SELECT TO authenticated USING (company_id = public.get_my_company_id());
CREATE POLICY "Manage own company praise" ON public.employee_praise FOR ALL TO authenticated USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- ============================================================
-- 3. EMPLOYEE PENALTIES TABLE  
-- ============================================================
CREATE TABLE public.employee_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  penalty_type TEXT NOT NULL DEFAULT 'deduction',
  category TEXT DEFAULT 'attendance',
  subject TEXT NOT NULL,
  description TEXT,
  deduction_amount NUMERIC DEFAULT 0,
  deduction_percentage NUMERIC DEFAULT 0,
  deduction_days INTEGER DEFAULT 0,
  affects_payroll BOOLEAN DEFAULT false,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by UUID,
  status TEXT NOT NULL DEFAULT 'active',
  auto_generate_document BOOLEAN DEFAULT false,
  generated_document_id UUID REFERENCES public.generated_documents(id),
  warning_id UUID REFERENCES public.employee_warnings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_penalties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own company penalties" ON public.employee_penalties FOR SELECT TO authenticated USING (company_id = public.get_my_company_id());
CREATE POLICY "Manage own company penalties" ON public.employee_penalties FOR ALL TO authenticated USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- ============================================================
-- 4. CAREER HISTORY TABLE
-- ============================================================
CREATE TABLE public.career_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'promotion',
  from_position TEXT,
  to_position TEXT,
  from_department TEXT,
  to_department TEXT,
  from_salary NUMERIC,
  to_salary NUMERIC,
  from_grade TEXT,
  to_grade TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.career_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own company career history" ON public.career_history FOR SELECT TO authenticated USING (company_id = public.get_my_company_id());
CREATE POLICY "Manage own company career history" ON public.career_history FOR ALL TO authenticated USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- ============================================================
-- 5. Add grade_id to employees for salary grade linking
-- ============================================================
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS grade_id UUID REFERENCES public.salary_grades(id);
