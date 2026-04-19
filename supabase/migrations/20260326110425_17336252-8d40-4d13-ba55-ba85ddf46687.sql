
-- 1. FIX: tenant_admin can set tenant_id to another company
DROP POLICY IF EXISTS "tenant_admin_insert_roles" ON public.user_roles;
CREATE POLICY "tenant_admin_insert_roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND user_id <> auth.uid()
  AND tenant_id = get_my_company_id()
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.user_id = auth.uid() AND p2.user_id = user_roles.user_id
  )
);

-- 2. FIX: training_enrollments cross-tenant via role check
DROP POLICY IF EXISTS "Own or HR can view enrollments" ON public.training_enrollments;
CREATE POLICY "Own or HR can view enrollments" ON public.training_enrollments
FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR (
    employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'tenant_admin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'hr_manager'::app_role)
      OR has_role(auth.uid(), 'hr_officer'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);

-- 3. FIX: platform_settings readable by all
DROP POLICY IF EXISTS "Authenticated can read platform settings" ON public.platform_settings;
CREATE POLICY "Admins can read platform settings" ON public.platform_settings
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'business_admin'::app_role)
);
