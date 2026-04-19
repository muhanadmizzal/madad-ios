
-- Phase 1A: Fix user_roles - add INSERT/UPDATE/DELETE restriction
-- First drop any existing permissive write policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
  DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
  DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'tenant_admin')
);

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'tenant_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'tenant_admin')
);

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'tenant_admin')
);

-- Phase 1B: Fix attendance_violations - add HR visibility policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_can_view_all_violations" ON public.attendance_violations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "hr_can_view_all_violations"
ON public.attendance_violations FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR public.has_role(auth.uid(), 'hr_officer')
  )
);
