
-- 1. FIX: tenant_admin UPDATE missing tenant_id check
DROP POLICY IF EXISTS "tenant_admin_update_roles" ON public.user_roles;
CREATE POLICY "tenant_admin_update_roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND tenant_id = get_my_company_id()
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.user_id = auth.uid() AND p2.user_id = user_roles.user_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND tenant_id = get_my_company_id()
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
);

-- 2. FIX: exit_surveys old broad SELECT still exists
DROP POLICY IF EXISTS "Users can view exit surveys in their company" ON public.exit_surveys;

-- 3. FIX: goals old broad SELECT still exists
DROP POLICY IF EXISTS "Users can view goals" ON public.goals;

-- 4. FIX: approval_requests old broad SELECT still exists
DROP POLICY IF EXISTS "Users can view approval requests" ON public.approval_requests;

-- 5. FIX: attendance_corrections old broad SELECT still exists
DROP POLICY IF EXISTS "Users can view company corrections" ON public.attendance_corrections;
