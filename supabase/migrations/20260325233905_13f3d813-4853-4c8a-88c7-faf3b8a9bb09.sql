
-- ═══════ HARDEN SELECT POLICIES ═══════
-- Replace broad company-wide SELECT with role-scoped + self-access

-- 1. candidates: HR roles + managers only
DROP POLICY IF EXISTS "Users can view candidates" ON public.candidates;
CREATE POLICY "Role-scoped candidate access"
ON public.candidates FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR public.has_role(auth.uid(), 'hr_officer')
    OR public.has_role(auth.uid(), 'manager')
  )
);

-- 2. background_checks: HR roles only
DROP POLICY IF EXISTS "Users can view bg checks" ON public.background_checks;
CREATE POLICY "HR can view bg checks"
ON public.background_checks FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR public.has_role(auth.uid(), 'hr_officer')
  )
);

-- 3. interview_schedules: HR + managers only
DROP POLICY IF EXISTS "Users can view interview schedules" ON public.interview_schedules;
CREATE POLICY "HR and managers can view interviews"
ON public.interview_schedules FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR public.has_role(auth.uid(), 'hr_officer')
    OR public.has_role(auth.uid(), 'manager')
  )
);

-- 4. attendance_records: HR roles + own records
DROP POLICY IF EXISTS "Users can view company attendance" ON public.attendance_records;
CREATE POLICY "Self or HR can view attendance"
ON public.attendance_records FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR public.has_role(auth.uid(), 'hr_officer')
    OR public.has_role(auth.uid(), 'manager')
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);

-- 5. leave_requests: HR roles + own requests
DROP POLICY IF EXISTS "Users can view company leave requests" ON public.leave_requests;
CREATE POLICY "Self or HR can view leave requests"
ON public.leave_requests FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR public.has_role(auth.uid(), 'hr_officer')
    OR public.has_role(auth.uid(), 'manager')
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);

-- 6. leave_balances: HR roles + own balance
DROP POLICY IF EXISTS "Users can view company leave balances" ON public.leave_balances;
CREATE POLICY "Self or HR can view leave balances"
ON public.leave_balances FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR public.has_role(auth.uid(), 'hr_officer')
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);

-- 7. payroll_runs: HR + finance only
DROP POLICY IF EXISTS "Users can view company payroll runs" ON public.payroll_runs;
CREATE POLICY "HR and finance can view payroll runs"
ON public.payroll_runs FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR public.has_role(auth.uid(), 'finance_manager')
  )
);

-- 8. salary_components: HR only
DROP POLICY IF EXISTS "Users can view salary components" ON public.salary_components;
CREATE POLICY "HR can view salary components"
ON public.salary_components FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
  )
);
