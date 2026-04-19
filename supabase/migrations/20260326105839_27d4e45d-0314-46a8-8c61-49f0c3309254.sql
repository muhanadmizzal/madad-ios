
-- 1. FIX: tenant_admin can assign 'tenant_admin' role (privilege escalation)
-- Add 'tenant_admin' to the excluded roles list

DROP POLICY IF EXISTS "tenant_admin_insert_roles" ON public.user_roles;
CREATE POLICY "tenant_admin_insert_roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
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
    WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
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
    WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
  )
);

-- 2. FIX: tenant_settings open to all company members for writes
-- Replace ALL policy with role-restricted write policies

DROP POLICY IF EXISTS "Admins can manage company settings" ON public.tenant_settings;

CREATE POLICY "Admins can manage company settings" ON public.tenant_settings
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

-- 3. FIX: digital_signatures - restrict SELECT to own signatures + HR roles

DROP POLICY IF EXISTS "Users can view company signatures" ON public.digital_signatures;

CREATE POLICY "Users can view own or HR can view all signatures" ON public.digital_signatures
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  )
);

-- 4. FIX: attendance_corrections - restrict INSERT to own employee record or HR

DROP POLICY IF EXISTS "Users can insert corrections" ON public.attendance_corrections;

CREATE POLICY "Users can insert own corrections or HR for any" ON public.attendance_corrections
FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_my_company_id()
  AND (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
  )
);

-- 5. FIX: attendance_records - restrict UPDATE to own record or HR/manager

DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_records;

CREATE POLICY "Users can update own attendance or HR for any" ON public.attendance_records
FOR UPDATE TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  company_id = get_my_company_id()
);
