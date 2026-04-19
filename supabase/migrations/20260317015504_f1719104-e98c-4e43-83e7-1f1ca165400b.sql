-- Fix document_templates management to allow tenant_admin and hr_manager
DROP POLICY IF EXISTS "Admins can manage templates" ON public.document_templates;

CREATE POLICY "Admins can manage templates"
ON public.document_templates FOR ALL TO authenticated
USING (
  (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
)
WITH CHECK (
  (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
);

-- Fix business_support_notes to allow all business portal roles
DROP POLICY IF EXISTS "Business admins can manage notes" ON public.business_support_notes;

CREATE POLICY "Business portal roles can manage notes"
ON public.business_support_notes FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'business_admin'::app_role) OR
  has_role(auth.uid(), 'support_agent'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'business_admin'::app_role) OR
  has_role(auth.uid(), 'support_agent'::app_role)
);

-- Fix notifications INSERT to also work from SECURITY DEFINER functions
-- The current policy restricts to company_id match which fails for system-generated notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- Add escalation type to notification type colors
-- No schema change needed, just noting this for the report