
-- ============================================================
-- FIX RLS POLICIES: Add hr_manager and tenant_admin where missing
-- ============================================================

-- 1. employee_assets: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage assets" ON employee_assets;
CREATE POLICY "HR can manage assets" ON employee_assets
  FOR ALL TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 2. employee_dependents: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage dependents" ON employee_dependents;
CREATE POLICY "HR can manage dependents" ON employee_dependents
  FOR ALL TO authenticated
  USING (
    (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 3. employee_emergency_contacts: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage emergency contacts" ON employee_emergency_contacts;
CREATE POLICY "HR can manage emergency contacts" ON employee_emergency_contacts
  FOR ALL TO authenticated
  USING (
    (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 4. employees: add hr_manager to delete
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
CREATE POLICY "HR can delete employees" ON employees
  FOR DELETE TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 5. exit_clearance: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage exit clearance" ON exit_clearance;
CREATE POLICY "HR can manage exit clearance" ON exit_clearance
  FOR ALL TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 6. loans: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage loans" ON loans;
CREATE POLICY "HR can manage loans" ON loans
  FOR ALL TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 7. loan_payments: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage loan payments" ON loan_payments;
CREATE POLICY "HR can manage loan payments" ON loan_payments
  FOR ALL TO authenticated
  USING (
    (loan_id IN (SELECT id FROM loans WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (loan_id IN (SELECT id FROM loans WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 8. payroll_items: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage payroll items" ON payroll_items;
CREATE POLICY "HR can manage payroll items" ON payroll_items
  FOR ALL TO authenticated
  USING (
    (payroll_run_id IN (SELECT id FROM payroll_runs WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (payroll_run_id IN (SELECT id FROM payroll_runs WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 9. public_holidays: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage holidays" ON public_holidays;
CREATE POLICY "HR can manage holidays" ON public_holidays
  FOR ALL TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 10. positions: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage positions" ON positions;
CREATE POLICY "HR can manage positions" ON positions
  FOR ALL TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 11. shifts: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage shifts" ON shifts;
CREATE POLICY "HR can manage shifts" ON shifts
  FOR ALL TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 12. shift_assignments: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage shift assignments" ON shift_assignments;
CREATE POLICY "HR can manage shift assignments" ON shift_assignments
  FOR ALL TO authenticated
  USING (
    (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 13. custom_fields: add hr_manager + tenant_admin to manage
DROP POLICY IF EXISTS "Admins can manage custom fields" ON custom_fields;
CREATE POLICY "HR can manage custom fields" ON custom_fields
  FOR ALL TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  )
  WITH CHECK (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 14. audit_logs: add tenant_admin and hr_manager to view
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "HR can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 15. user_roles: add tenant_admin + hr_manager to view tenant roles
DROP POLICY IF EXISTS "Admins can view tenant roles" ON user_roles;
CREATE POLICY "Admins can view tenant roles" ON user_roles
  FOR SELECT TO authenticated
  USING (
    (tenant_id = get_my_company_id())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager'))
  );

-- 16. documents: add UPDATE policy for HR
DROP POLICY IF EXISTS "HR can update documents" ON documents;
CREATE POLICY "HR can update documents" ON documents
  FOR UPDATE TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'hr_manager') OR has_role(auth.uid(), 'hr_officer'))
  );

-- 17. companies: add tenant_admin to update own company
DROP POLICY IF EXISTS "Admins can update own company" ON companies;
CREATE POLICY "Admins can update own company" ON companies
  FOR UPDATE TO authenticated
  USING (
    (id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin'))
  );
