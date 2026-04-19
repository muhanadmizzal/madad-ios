
-- ============================================================
-- PART 1: Core security helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_is_platform_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('super_admin', 'business_admin', 'technical_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_is_tenant_hr(p_user_id uuid DEFAULT auth.uid(), p_company_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role IN ('tenant_admin', 'admin', 'hr_manager', 'hr_officer')
      AND (p_company_id IS NULL OR tenant_id = p_company_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_is_manager_of(p_actor_uid uuid, p_target_employee_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_target_pos uuid; v_current uuid; v_actor_pos uuid; v_depth int := 0;
BEGIN
  SELECT position_id INTO v_actor_pos FROM employees WHERE user_id = p_actor_uid AND status = 'active' LIMIT 1;
  IF v_actor_pos IS NULL THEN RETURN false; END IF;
  SELECT position_id INTO v_target_pos FROM employees WHERE id = p_target_employee_id AND status = 'active' LIMIT 1;
  IF v_target_pos IS NULL THEN RETURN false; END IF;
  v_current := v_target_pos;
  WHILE v_current IS NOT NULL AND v_depth < 20 LOOP
    SELECT parent_position_id INTO v_current FROM positions WHERE id = v_current;
    IF v_current = v_actor_pos THEN RETURN true; END IF;
    v_depth := v_depth + 1;
  END LOOP;
  RETURN false;
END;
$$;

-- ============================================================
-- PART 2: Fix policies for tables WITH company_id
-- ============================================================

-- addon_requests
DROP POLICY IF EXISTS "Tenant users can view own addon requests" ON addon_requests;
CREATE POLICY "Tenant users can view own addon requests" ON addon_requests FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Tenant admins can insert addon requests" ON addon_requests;
CREATE POLICY "Tenant admins can insert addon requests" ON addon_requests FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());

-- announcements
DROP POLICY IF EXISTS "Users can view announcements" ON announcements;
CREATE POLICY "Users can view announcements" ON announcements FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "HR can manage announcements" ON announcements;
CREATE POLICY "HR can manage announcements" ON announcements FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- appraisals
DROP POLICY IF EXISTS "Admins can manage appraisals" ON appraisals;
CREATE POLICY "Admins can manage appraisals" ON appraisals FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- approval_requests
DROP POLICY IF EXISTS "Admins can update approval requests" ON approval_requests;
CREATE POLICY "Admins can update approval requests" ON approval_requests FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- attendance_corrections
DROP POLICY IF EXISTS "Admins can update corrections" ON attendance_corrections;
CREATE POLICY "Admins can update corrections" ON attendance_corrections FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- audit_logs
DROP POLICY IF EXISTS "HR can view audit logs" ON audit_logs;
CREATE POLICY "HR can view audit logs" ON audit_logs FOR SELECT TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- background_checks
DROP POLICY IF EXISTS "Hiring team can update bg checks" ON background_checks;
CREATE POLICY "Hiring team can update bg checks" ON background_checks FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "Hiring team can delete bg checks" ON background_checks;
CREATE POLICY "Hiring team can delete bg checks" ON background_checks FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- branches
DROP POLICY IF EXISTS "Users can view company branches" ON branches;
CREATE POLICY "Users can view company branches" ON branches FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Admins can manage branches" ON branches;
CREATE POLICY "Admins can manage branches" ON branches FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- candidates
DROP POLICY IF EXISTS "Hiring team can update candidates" ON candidates;
CREATE POLICY "Hiring team can update candidates" ON candidates FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "Hiring team can delete candidates" ON candidates;
CREATE POLICY "Hiring team can delete candidates" ON candidates FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- candidate_stage_history (no company_id, uses candidate join)
DROP POLICY IF EXISTS "Users can view stage history" ON candidate_stage_history;
CREATE POLICY "Users can view stage history" ON candidate_stage_history FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM candidates WHERE company_id = get_my_company_id()));

-- companies
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company" ON companies FOR SELECT TO authenticated
  USING (id = get_my_company_id() OR get_is_platform_admin());
DROP POLICY IF EXISTS "Admins can update own company" ON companies;
CREATE POLICY "Admins can update own company" ON companies FOR UPDATE TO authenticated
  USING (id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), id));

-- contracts
DROP POLICY IF EXISTS "HR can manage contracts" ON contracts;
CREATE POLICY "HR can manage contracts" ON contracts FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- custom_fields
DROP POLICY IF EXISTS "Users can view custom fields" ON custom_fields;
CREATE POLICY "Users can view custom fields" ON custom_fields FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "HR can manage custom fields" ON custom_fields;
CREATE POLICY "HR can manage custom fields" ON custom_fields FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- custom_field_values (no company_id)
DROP POLICY IF EXISTS "Users can view field values" ON custom_field_values;
CREATE POLICY "Users can view field values" ON custom_field_values FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage field values" ON custom_field_values;
CREATE POLICY "Admins can manage field values" ON custom_field_values FOR ALL TO authenticated
  USING (get_is_tenant_hr(auth.uid())) WITH CHECK (get_is_tenant_hr(auth.uid()));

-- departments
DROP POLICY IF EXISTS "Users can view company departments" ON departments;
CREATE POLICY "Users can view company departments" ON departments FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "HR can update departments" ON departments;
CREATE POLICY "HR can update departments" ON departments FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "HR can delete departments" ON departments;
CREATE POLICY "HR can delete departments" ON departments FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- document_templates
DROP POLICY IF EXISTS "Users can view templates" ON document_templates;
CREATE POLICY "Users can view templates" ON document_templates FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Admins can manage templates" ON document_templates;
CREATE POLICY "Admins can manage templates" ON document_templates FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- documents
DROP POLICY IF EXISTS "Users can view company documents" ON documents;
CREATE POLICY "Users can view company documents" ON documents FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "HR can update documents" ON documents;
CREATE POLICY "HR can update documents" ON documents FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "HR can delete documents" ON documents;
CREATE POLICY "HR can delete documents" ON documents FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- employee_assets
DROP POLICY IF EXISTS "Users can view assets" ON employee_assets;
CREATE POLICY "Users can view assets" ON employee_assets FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "HR can manage assets" ON employee_assets;
CREATE POLICY "HR can manage assets" ON employee_assets FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- employee_warnings
DROP POLICY IF EXISTS "Admins can manage warnings" ON employee_warnings;
CREATE POLICY "Admins can manage warnings" ON employee_warnings FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- employees
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
CREATE POLICY "Admins can update employees" ON employees FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "HR can delete employees" ON employees;
CREATE POLICY "HR can delete employees" ON employees FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- exit_clearance
DROP POLICY IF EXISTS "HR can manage exit clearance" ON exit_clearance;
CREATE POLICY "HR can manage exit clearance" ON exit_clearance FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- goals
DROP POLICY IF EXISTS "Admins can manage goals" ON goals;
CREATE POLICY "Admins can manage goals" ON goals FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- interview_schedules
DROP POLICY IF EXISTS "Hiring team can update interviews" ON interview_schedules;
CREATE POLICY "Hiring team can update interviews" ON interview_schedules FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "Hiring team can delete interviews" ON interview_schedules;
CREATE POLICY "Hiring team can delete interviews" ON interview_schedules FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- interview_scorecards
DROP POLICY IF EXISTS "Admins can manage scorecards" ON interview_scorecards;
CREATE POLICY "Admins can manage scorecards" ON interview_scorecards FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "Users can view scorecards" ON interview_scorecards;
CREATE POLICY "Users can view scorecards" ON interview_scorecards FOR SELECT TO authenticated USING (company_id = get_my_company_id());

-- leave_balances
DROP POLICY IF EXISTS "Admins can manage leave balances" ON leave_balances;
CREATE POLICY "Admins can manage leave balances" ON leave_balances FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- leave_requests
DROP POLICY IF EXISTS "Admins can update leave requests" ON leave_requests;
CREATE POLICY "Admins can update leave requests" ON leave_requests FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "Admins can delete leave requests" ON leave_requests;
CREATE POLICY "Admins can delete leave requests" ON leave_requests FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- leave_types
DROP POLICY IF EXISTS "Users can view company leave types" ON leave_types;
CREATE POLICY "Users can view company leave types" ON leave_types FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "HR can manage leave types" ON leave_types;
CREATE POLICY "HR can manage leave types" ON leave_types FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

-- offer_letters
DROP POLICY IF EXISTS "Users can view offers" ON offer_letters;
CREATE POLICY "Users can view offers" ON offer_letters FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Hiring team can update offers" ON offer_letters;
CREATE POLICY "Hiring team can update offers" ON offer_letters FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
DROP POLICY IF EXISTS "Hiring team can delete offers" ON offer_letters;
CREATE POLICY "Hiring team can delete offers" ON offer_letters FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- onboarding_tasks
DROP POLICY IF EXISTS "Users can view onboarding tasks" ON onboarding_tasks;
CREATE POLICY "Users can view onboarding tasks" ON onboarding_tasks FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "HR can manage onboarding tasks" ON onboarding_tasks;
CREATE POLICY "HR can manage onboarding tasks" ON onboarding_tasks FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- positions
DROP POLICY IF EXISTS "Users can view positions" ON positions;
CREATE POLICY "Users can view positions" ON positions FOR SELECT TO authenticated USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "HR can manage positions" ON positions;
CREATE POLICY "HR can manage positions" ON positions FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR get_is_platform_admin() OR get_is_tenant_hr(auth.uid(), company_id));

-- public_holidays
DROP POLICY IF EXISTS "Users can view company holidays" ON public_holidays;
CREATE POLICY "Users can view company holidays" ON public_holidays FOR SELECT TO authenticated USING (company_id = get_my_company_id());

-- recruitment_jobs
DROP POLICY IF EXISTS "Users can view recruitment jobs" ON recruitment_jobs;
CREATE POLICY "Users can view recruitment jobs" ON recruitment_jobs FOR SELECT TO authenticated USING (company_id = get_my_company_id());

-- shifts
DROP POLICY IF EXISTS "Users can view shifts" ON shifts;
CREATE POLICY "Users can view shifts" ON shifts FOR SELECT TO authenticated USING (company_id = get_my_company_id());

-- workflow_templates
DROP POLICY IF EXISTS "Users can view workflow templates" ON workflow_templates;
CREATE POLICY "Users can view workflow templates" ON workflow_templates FOR SELECT TO authenticated USING (company_id = get_my_company_id());

-- workflow_instances: requester OR current approver OR HR can see
DROP POLICY IF EXISTS "Users can view own instances" ON workflow_instances;
CREATE POLICY "Users can view workflow instances" ON workflow_instances FOR SELECT TO authenticated
  USING (company_id = get_my_company_id() AND (
    requester_user_id = auth.uid()
    OR current_approver_id = auth.uid()
    OR get_is_tenant_hr(auth.uid(), company_id)
  ));

-- workflow_steps
DROP POLICY IF EXISTS "Users can view workflow steps" ON workflow_steps;
CREATE POLICY "Users can view workflow steps" ON workflow_steps FOR SELECT TO authenticated
  USING (template_id IN (SELECT id FROM workflow_templates WHERE company_id = get_my_company_id()));

-- Tables without company_id: use employee_id join
-- employee_dependents
DROP POLICY IF EXISTS "HR can manage dependents" ON employee_dependents;
CREATE POLICY "HR can manage dependents" ON employee_dependents FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()));

-- employee_emergency_contacts
DROP POLICY IF EXISTS "HR can manage emergency contacts" ON employee_emergency_contacts;
CREATE POLICY "HR can manage emergency contacts" ON employee_emergency_contacts FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()));

-- employee_notes
DROP POLICY IF EXISTS "Admins can manage notes" ON employee_notes;
CREATE POLICY "Admins can manage notes" ON employee_notes FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()));
DROP POLICY IF EXISTS "Admins can view notes" ON employee_notes;
CREATE POLICY "Admins can view notes" ON employee_notes FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()));

-- employee_salary_components
DROP POLICY IF EXISTS "HR can manage emp salary components" ON employee_salary_components;
CREATE POLICY "HR can manage emp salary components" ON employee_salary_components FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()));

-- loan_payments (through loan_id → loans.company_id)
DROP POLICY IF EXISTS "HR can manage loan payments" ON loan_payments;
CREATE POLICY "HR can manage loan payments" ON loan_payments FOR ALL TO authenticated
  USING (loan_id IN (SELECT id FROM loans WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()))
  WITH CHECK (loan_id IN (SELECT id FROM loans WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()));

-- payroll_items (through payroll_run_id → payroll_runs.company_id)
DROP POLICY IF EXISTS "HR can manage payroll items" ON payroll_items;
CREATE POLICY "HR can manage payroll items" ON payroll_items FOR ALL TO authenticated
  USING (payroll_run_id IN (SELECT id FROM payroll_runs WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()))
  WITH CHECK (payroll_run_id IN (SELECT id FROM payroll_runs WHERE company_id = get_my_company_id()) AND get_is_tenant_hr(auth.uid()));

-- payroll_runs
DROP POLICY IF EXISTS "HR can manage payroll runs" ON payroll_runs;
CREATE POLICY "HR can manage payroll runs" ON payroll_runs FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));

-- loans
DROP POLICY IF EXISTS "HR can manage loans" ON loans;
CREATE POLICY "HR can manage loans" ON loans FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id))
  WITH CHECK (company_id = get_my_company_id() AND get_is_tenant_hr(auth.uid(), company_id));
