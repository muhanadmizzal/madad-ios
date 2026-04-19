
-- Fix remaining issues (round 2 - corrected)

-- 1. payroll_policies: restrict write to admin/HR
DROP POLICY IF EXISTS "Tenant isolation for payroll_policies" ON public.payroll_policies;
CREATE POLICY "Users can view payroll policies" ON public.payroll_policies
FOR SELECT TO authenticated USING (company_id = get_my_company_id());
CREATE POLICY "Admins can manage payroll policies" ON public.payroll_policies
FOR ALL TO authenticated
USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role) OR has_role(auth.uid(),'hr_manager'::app_role)))
WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role) OR has_role(auth.uid(),'hr_manager'::app_role)));

-- 2. payroll_attendance_summary: restrict write to admin/HR
DROP POLICY IF EXISTS "Tenant isolation for payroll_attendance_summary" ON public.payroll_attendance_summary;
CREATE POLICY "HR can manage payroll attendance summary" ON public.payroll_attendance_summary
FOR ALL TO authenticated
USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role) OR has_role(auth.uid(),'hr_manager'::app_role) OR has_role(auth.uid(),'hr_officer'::app_role)))
WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role) OR has_role(auth.uid(),'hr_manager'::app_role) OR has_role(auth.uid(),'hr_officer'::app_role)));
CREATE POLICY "Employees can view own payroll attendance" ON public.payroll_attendance_summary
FOR SELECT TO authenticated
USING (company_id = get_my_company_id() AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- 3. tenant_ai_features: restrict write to admins
DROP POLICY IF EXISTS "Tenant isolation for tenant_ai_features" ON public.tenant_ai_features;
CREATE POLICY "Users can view tenant AI features" ON public.tenant_ai_features
FOR SELECT TO authenticated USING (company_id = get_my_company_id());
CREATE POLICY "Admins can manage tenant AI features" ON public.tenant_ai_features
FOR ALL TO authenticated
USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role)))
WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role)));

-- 4. employees: restrict to HR/manager + own record
DROP POLICY IF EXISTS "Users can view company employees" ON public.employees;
CREATE POLICY "HR can view all employees" ON public.employees
FOR SELECT TO authenticated
USING (company_id = get_my_company_id() AND (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role)
  OR has_role(auth.uid(),'hr_manager'::app_role) OR has_role(auth.uid(),'hr_officer'::app_role)
  OR has_role(auth.uid(),'manager'::app_role)
));
CREATE POLICY "Employees can view own record" ON public.employees
FOR SELECT TO authenticated
USING (company_id = get_my_company_id() AND user_id = auth.uid());

-- 5. tenant_ai_quotas: restrict write to admins
DROP POLICY IF EXISTS "Users can insert own company AI quotas" ON public.tenant_ai_quotas;
DROP POLICY IF EXISTS "Users can update own company AI quotas" ON public.tenant_ai_quotas;
CREATE POLICY "Admins can insert AI quotas" ON public.tenant_ai_quotas
FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role)));
CREATE POLICY "Admins can update AI quotas" ON public.tenant_ai_quotas
FOR UPDATE TO authenticated
USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role)));

-- 6. loan_payments: restrict to HR + own (no company_id column, join through loans)
DROP POLICY IF EXISTS "Users can view loan payments" ON public.loan_payments;
CREATE POLICY "HR and own loan payments visible" ON public.loan_payments
FOR SELECT TO authenticated
USING (
  loan_id IN (SELECT id FROM loans WHERE company_id = get_my_company_id())
  AND (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role)
    OR has_role(auth.uid(),'hr_manager'::app_role) OR has_role(auth.uid(),'hr_officer'::app_role)
    OR loan_id IN (SELECT id FROM loans WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
  )
);

-- 7. employee_dependents: restrict to HR + own
DROP POLICY IF EXISTS "Users can view dependents" ON public.employee_dependents;
CREATE POLICY "HR and own dependents visible" ON public.employee_dependents
FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
  AND (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role)
    OR has_role(auth.uid(),'hr_manager'::app_role) OR has_role(auth.uid(),'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

-- 8. employee_emergency_contacts: restrict to HR + own
DROP POLICY IF EXISTS "Users can view emergency contacts" ON public.employee_emergency_contacts;
CREATE POLICY "HR and own emergency contacts visible" ON public.employee_emergency_contacts
FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
  AND (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tenant_admin'::app_role)
    OR has_role(auth.uid(),'hr_manager'::app_role) OR has_role(auth.uid(),'hr_officer'::app_role)
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);
