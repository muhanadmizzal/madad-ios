
-- 8. FIX: training_enrollments (no company_id - join through course or employee)
DROP POLICY IF EXISTS "Users can view enrollments v2" ON public.training_enrollments;
CREATE POLICY "Own or HR can view enrollments" ON public.training_enrollments
FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'tenant_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'hr_manager'::app_role)
  OR has_role(auth.uid(), 'hr_officer'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- 9. FIX: tenant_admin policies use p1.user_id
DROP POLICY IF EXISTS "tenant_admin_insert_roles" ON public.user_roles;
CREATE POLICY "tenant_admin_insert_roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND user_id <> auth.uid()
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.user_id = auth.uid() AND p2.user_id = user_roles.user_id
  )
);

DROP POLICY IF EXISTS "tenant_admin_update_roles" ON public.user_roles;
CREATE POLICY "tenant_admin_update_roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.user_id = auth.uid() AND p2.user_id = user_roles.user_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
);

DROP POLICY IF EXISTS "tenant_admin_delete_roles" ON public.user_roles;
CREATE POLICY "tenant_admin_delete_roles" ON public.user_roles
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.user_id = auth.uid() AND p2.user_id = user_roles.user_id
  )
);
