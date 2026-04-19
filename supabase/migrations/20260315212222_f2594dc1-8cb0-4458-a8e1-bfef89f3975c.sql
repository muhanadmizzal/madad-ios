
-- Fix leave_types: add tenant_admin support and proper WITH CHECK
DROP POLICY IF EXISTS "Admins can manage leave types" ON public.leave_types;
CREATE POLICY "Admins can manage leave types" ON public.leave_types
FOR ALL TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
);

-- Fix workflow_templates: add tenant_admin support
DROP POLICY IF EXISTS "Admins can manage workflow templates" ON public.workflow_templates;
CREATE POLICY "Admins can manage workflow templates" ON public.workflow_templates
FOR ALL TO authenticated
USING (
  company_id = get_my_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
)
WITH CHECK (
  company_id = get_my_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
);

-- Fix workflow_steps: add tenant_admin support
DROP POLICY IF EXISTS "Admins can manage workflow steps" ON public.workflow_steps;
CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps
FOR ALL TO authenticated
USING (
  template_id IN (SELECT id FROM workflow_templates WHERE company_id = get_my_company_id())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
)
WITH CHECK (
  template_id IN (SELECT id FROM workflow_templates WHERE company_id = get_my_company_id())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
);
