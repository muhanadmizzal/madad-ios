
-- ============================================
-- PROJECT HUB — Matrix Structure Tables
-- ============================================

-- 1. Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','archived')),
  start_date date,
  end_date date,
  budget numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  cost_center text,
  description text,
  project_manager_position_id uuid REFERENCES public.positions(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for projects" ON public.projects
  FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- 2. Project positions (mini org chart per project)
CREATE TABLE IF NOT EXISTS public.project_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text,
  parent_project_position_id uuid REFERENCES public.project_positions(id),
  is_manager boolean DEFAULT false,
  responsibilities jsonb DEFAULT '[]',
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for project_positions" ON public.project_positions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.company_id = public.get_my_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.company_id = public.get_my_company_id()));

-- 3. Project assignments (employees assigned to projects)
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  position_id uuid REFERENCES public.positions(id),
  project_role text NOT NULL DEFAULT 'member',
  project_position_id uuid REFERENCES public.project_positions(id),
  allocation_percentage int NOT NULL DEFAULT 100 CHECK (allocation_percentage BETWEEN 0 AND 100),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for project_assignments" ON public.project_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.company_id = public.get_my_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.company_id = public.get_my_company_id()));

-- 4. Timesheets for cost tracking
CREATE TABLE IF NOT EXISTS public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  description text,
  calculated_cost numeric DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for timesheets" ON public.timesheets
  FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- 5. Project cost allocation view helper
CREATE OR REPLACE FUNCTION public.get_project_cost_allocation(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'project_id', p_project_id,
    'total_budget', COALESCE(p.budget, 0),
    'total_spent', COALESCE(p.spent, 0),
    'allocations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'employee_id', pa.employee_id,
        'employee_name', e.first_name || ' ' || e.last_name,
        'position_title', pos.title,
        'allocation_pct', pa.allocation_percentage,
        'monthly_cost', ROUND(COALESCE(e.salary, 0) * pa.allocation_percentage / 100.0, 2),
        'project_role', pa.project_role
      ))
      FROM project_assignments pa
      JOIN employees e ON e.id = pa.employee_id
      LEFT JOIN positions pos ON pos.id = pa.position_id
      WHERE pa.project_id = p_project_id AND pa.is_active = true
    ), '[]'::jsonb),
    'total_monthly_cost', COALESCE((
      SELECT SUM(ROUND(COALESCE(e.salary, 0) * pa.allocation_percentage / 100.0, 2))
      FROM project_assignments pa
      JOIN employees e ON e.id = pa.employee_id
      WHERE pa.project_id = p_project_id AND pa.is_active = true
    ), 0)
  )
  INTO v_result
  FROM projects p
  WHERE p.id = p_project_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 6. Get employee's project managers
CREATE OR REPLACE FUNCTION public.get_employee_project_managers(p_employee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'project_id', pr.id,
      'project_name', pr.name,
      'project_code', pr.code,
      'manager_position_id', pr.project_manager_position_id,
      'manager_name', (
        SELECT e2.first_name || ' ' || e2.last_name
        FROM employees e2
        WHERE e2.position_id = pr.project_manager_position_id
        AND e2.status = 'active'
        LIMIT 1
      ),
      'allocation_pct', pa.allocation_percentage,
      'project_role', pa.project_role
    ))
    FROM project_assignments pa
    JOIN projects pr ON pr.id = pa.project_id
    WHERE pa.employee_id = p_employee_id
    AND pa.is_active = true
    AND pr.status = 'active'
  ), '[]'::jsonb);
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(company_id, status);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON public.project_assignments(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_project_assignments_employee ON public.project_assignments(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_timesheets_project ON public.timesheets(project_id, date);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON public.timesheets(employee_id, date);
