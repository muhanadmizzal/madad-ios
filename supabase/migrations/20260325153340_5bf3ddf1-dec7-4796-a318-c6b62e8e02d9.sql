
-- Add position_id FK to employees for org-chart linkage
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.positions(id);

-- Add service_permissions JSONB to positions for feature toggles
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS service_permissions jsonb DEFAULT NULL;

-- Add title column to positions if missing (alias for title_en)
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS title text GENERATED ALWAYS AS (COALESCE(title_en, title_ar)) STORED;

-- Backend helper: resolve current user's position ID
CREATE OR REPLACE FUNCTION public.resolve_my_position_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.position_id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
    AND e.status = 'active'
    AND e.company_id = get_my_company_id()
    AND e.position_id IS NOT NULL
  LIMIT 1
$$;

-- Backend helper: resolve managed employee IDs (direct reports)
CREATE OR REPLACE FUNCTION public.resolve_managed_employee_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_agg(id), '{}'::uuid[])
  FROM public.employees
  WHERE manager_user_id = auth.uid()
    AND company_id = get_my_company_id()
    AND status = 'active'
$$;

-- Backend helper: resolve position-based workflow approver
CREATE OR REPLACE FUNCTION public.resolve_position_approver(p_position_id uuid, p_company_id uuid)
RETURNS TABLE(approver_user_id uuid, approver_name text, approver_position text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.user_id, COALESCE(e.name_ar, e.name_en, pr.full_name), COALESCE(p.title_ar, p.title_en)
  FROM public.employees e
  JOIN public.positions p ON p.id = e.position_id
  LEFT JOIN public.profiles pr ON pr.user_id = e.user_id
  WHERE e.position_id = p_position_id
    AND e.company_id = p_company_id
    AND e.status = 'active'
  LIMIT 1
$$;
