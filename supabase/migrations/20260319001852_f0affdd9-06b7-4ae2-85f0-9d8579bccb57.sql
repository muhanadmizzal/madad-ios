-- Fix RLS: Grant hr_manager write access to key tables

-- 1. PAYROLL_RUNS
DROP POLICY IF EXISTS "Admins can manage payroll runs" ON payroll_runs;
CREATE POLICY "HR can manage payroll runs" ON payroll_runs
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

-- 2. SALARY_COMPONENTS
DROP POLICY IF EXISTS "Admins can manage salary components" ON salary_components;
CREATE POLICY "HR can manage salary components" ON salary_components
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

-- 3. EMPLOYEE_SALARY_COMPONENTS
DROP POLICY IF EXISTS "Admins can manage emp salary components" ON employee_salary_components;
CREATE POLICY "HR can manage emp salary components" ON employee_salary_components
  FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

-- 4. DEPARTMENTS
DROP POLICY IF EXISTS "Admins can insert departments" ON departments;
DROP POLICY IF EXISTS "Admins can update departments" ON departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON departments;
CREATE POLICY "HR can insert departments" ON departments FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));
CREATE POLICY "HR can update departments" ON departments FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));
CREATE POLICY "HR can delete departments" ON departments FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

-- 5. ANNOUNCEMENTS
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "HR can manage announcements" ON announcements FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

-- 6. ONBOARDING_TASKS
DROP POLICY IF EXISTS "Admins can manage onboarding tasks" ON onboarding_tasks;
CREATE POLICY "HR can manage onboarding tasks" ON onboarding_tasks FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

-- 7. LEAVE_TYPES
DROP POLICY IF EXISTS "Admins can manage leave types" ON leave_types;
CREATE POLICY "HR can manage leave types" ON leave_types FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

-- 8. DOCUMENTS delete
DROP POLICY IF EXISTS "Admins can delete documents" ON documents;
CREATE POLICY "HR can delete documents" ON documents FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

-- 9. CONTRACTS
DROP POLICY IF EXISTS "Admins can manage contracts" ON contracts;
CREATE POLICY "HR can manage contracts" ON contracts FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));
