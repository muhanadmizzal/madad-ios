
-- Fix policy_assignments: add tenant_admin to manage policy, add WITH CHECK
DROP POLICY IF EXISTS "Admins can manage policy assignments" ON public.policy_assignments;
CREATE POLICY "Admins can manage policy assignments" ON public.policy_assignments
FOR ALL TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  )
)
WITH CHECK (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  )
);

-- Ensure employees can view their own policy assignment
DROP POLICY IF EXISTS "Users can view policy assignments" ON public.policy_assignments;
CREATE POLICY "Users can view policy assignments" ON public.policy_assignments
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
);
