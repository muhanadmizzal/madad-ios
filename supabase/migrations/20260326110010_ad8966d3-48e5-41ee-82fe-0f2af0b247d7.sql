
-- 1. FIX: Prevent tenant_admin self-role-assignment + restrict broader insert policy
DROP POLICY IF EXISTS "tenant_admin_insert_roles" ON public.user_roles;
CREATE POLICY "tenant_admin_insert_roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role)
  AND user_id <> auth.uid()
  AND role <> ALL (ARRAY['super_admin'::app_role, 'business_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role, 'support_agent'::app_role, 'sales_manager'::app_role, 'technical_admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
  )
);

-- Also restrict the broader "Only admins can insert roles" to super_admin only
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only super_admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only super_admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only super_admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 2. FIX: Employees can update sensitive fields on own record
-- Replace self-update with a controlled function
DROP POLICY IF EXISTS "Employees can update own record" ON public.employees;

CREATE OR REPLACE FUNCTION public.update_own_employee_profile(
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE employees
  SET
    phone = COALESCE(p_phone, phone),
    address = COALESCE(p_address, address),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- 3. FIX: request_documents missing company_id check
DROP POLICY IF EXISTS "employees_view_own_request_docs" ON public.request_documents;
CREATE POLICY "employees_view_own_request_docs" ON public.request_documents
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    requester_user_id = auth.uid()
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
  )
);

-- 4. FIX: exit_surveys open to all company members
DROP POLICY IF EXISTS "Users can view exit surveys" ON public.exit_surveys;
DROP POLICY IF EXISTS "Users can insert exit surveys" ON public.exit_surveys;
DROP POLICY IF EXISTS "Users can update exit surveys" ON public.exit_surveys;
DROP POLICY IF EXISTS "company_isolation_exit_surveys" ON public.exit_surveys;

CREATE POLICY "HR can manage exit surveys" ON public.exit_surveys
FOR ALL TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  company_id = get_my_company_id()
);

-- 5. FIX: timesheets open to all
DROP POLICY IF EXISTS "Tenant isolation for timesheets" ON public.timesheets;

CREATE POLICY "Own or HR can view timesheets" ON public.timesheets
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

CREATE POLICY "Own or HR can insert timesheets" ON public.timesheets
FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_my_company_id()
  AND (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

CREATE POLICY "Own or HR can update timesheets" ON public.timesheets
FOR UPDATE TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "HR can delete timesheets" ON public.timesheets
FOR DELETE TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  )
);

-- 6. FIX: agency_clients open to all
DROP POLICY IF EXISTS "Users can manage agency clients in their company" ON public.agency_clients;

CREATE POLICY "Users can view agency clients" ON public.agency_clients
FOR SELECT TO authenticated
USING (company_id = get_my_company_id());

CREATE POLICY "HR can manage agency clients" ON public.agency_clients
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
);
