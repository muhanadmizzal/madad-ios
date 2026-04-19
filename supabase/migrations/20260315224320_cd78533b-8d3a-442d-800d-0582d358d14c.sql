
-- ============================================================
-- SECURITY FIX: Comprehensive RLS hardening
-- ============================================================

-- 1. FIX CRITICAL: Prevent profile company_id tampering (cross-tenant escalation)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

-- 2. FIX CRITICAL: has_role must be tenant-aware
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role
      AND (
        scope_type = 'platform'
        OR tenant_id = (SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1)
      )
  )
$$;

-- 3. FIX CRITICAL: Restrict sensitive data - payroll_items (salary data)
DROP POLICY IF EXISTS "Users can view payroll items" ON public.payroll_items;
CREATE POLICY "HR can view payroll items" ON public.payroll_items
FOR SELECT TO authenticated
USING (
  payroll_run_id IN (
    SELECT id FROM payroll_runs WHERE company_id = get_my_company_id()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

-- 4. FIX CRITICAL: Restrict sensitive data - contracts (salary)
DROP POLICY IF EXISTS "Users can view contracts" ON public.contracts;
CREATE POLICY "HR and own contracts visible" ON public.contracts
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

-- 5. FIX CRITICAL: Restrict sensitive data - loans
DROP POLICY IF EXISTS "Users can view loans" ON public.loans;
CREATE POLICY "HR and own loans visible" ON public.loans
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

-- 6. FIX CRITICAL: Restrict sensitive data - employee_salary_components
DROP POLICY IF EXISTS "Users can view emp salary components" ON public.employee_salary_components;
CREATE POLICY "HR and own salary components visible" ON public.employee_salary_components
FOR SELECT TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE company_id = get_my_company_id()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

-- 7. FIX CRITICAL: Restrict sensitive data - appraisals
DROP POLICY IF EXISTS "Users can view appraisals" ON public.appraisals;
CREATE POLICY "HR and own appraisals visible" ON public.appraisals
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

-- 8. FIX CRITICAL: Restrict sensitive data - exit_clearance
DROP POLICY IF EXISTS "Users can view exit clearance" ON public.exit_clearance;
CREATE POLICY "HR and own exit clearance visible" ON public.exit_clearance
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

-- 9. FIX ERROR: Remove overpermissive ALL policy on generated_documents
DROP POLICY IF EXISTS "tenant_hr_manage_generated_docs" ON public.generated_documents;

-- 10. FIX WARN: support_tickets - split ALL into proper per-operation policies
DROP POLICY IF EXISTS "Users can manage own tickets" ON public.support_tickets;

CREATE POLICY "Users can view company tickets" ON public.support_tickets
FOR SELECT TO authenticated
USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own tickets" ON public.support_tickets
FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_my_company_id()
  AND submitted_by = auth.uid()
);

CREATE POLICY "Users can update own tickets" ON public.support_tickets
FOR UPDATE TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    submitted_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  )
);

CREATE POLICY "Admins can delete tickets" ON public.support_tickets
FOR DELETE TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
  )
);

-- 11. FIX WARN: Change public role to authenticated for 3 tables
DROP POLICY IF EXISTS "Tenant isolation for payroll_attendance_summary" ON public.payroll_attendance_summary;
CREATE POLICY "Tenant isolation for payroll_attendance_summary" ON public.payroll_attendance_summary
FOR ALL TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Tenant isolation for tenant_ai_features" ON public.tenant_ai_features;
CREATE POLICY "Tenant isolation for tenant_ai_features" ON public.tenant_ai_features
FOR ALL TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Tenant isolation for payroll_policies" ON public.payroll_policies;
CREATE POLICY "Tenant isolation for payroll_policies" ON public.payroll_policies
FOR ALL TO authenticated
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());
