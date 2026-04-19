
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS parent_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'department';

COMMENT ON COLUMN public.departments.level IS 'department=قسم, section=شعبة, unit=وحدة';
COMMENT ON COLUMN public.departments.parent_department_id IS 'Self-referencing FK for sub-department hierarchy';

CREATE OR REPLACE FUNCTION public.generate_position_code(p_company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'POS-' || LPAD(
    (COALESCE(
      (SELECT MAX(CAST(SUBSTRING(position_code FROM 5) AS integer))
       FROM positions
       WHERE company_id = p_company_id
         AND position_code ~ '^POS-[0-9]+$'),
      0
    ) + 1)::text,
    4, '0'
  );
$$;
