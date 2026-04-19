-- Fix 1: invoice_items policies - change from public to authenticated role
DROP POLICY IF EXISTS "Super admins can manage invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Tenant can read own invoice items" ON public.invoice_items;

CREATE POLICY "Super admins can manage invoice items"
ON public.invoice_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant can read own invoice items"
ON public.invoice_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM billing_invoices bi
  WHERE bi.id = invoice_items.invoice_id AND bi.company_id = get_my_company_id()
));

-- Fix 2: subscription_change_requests - change from public to authenticated
DROP POLICY IF EXISTS "Super admins can manage requests" ON public.subscription_change_requests;
DROP POLICY IF EXISTS "Tenant admins can create own requests" ON public.subscription_change_requests;
DROP POLICY IF EXISTS "Tenant admins can read own requests" ON public.subscription_change_requests;

CREATE POLICY "Super admins can manage requests"
ON public.subscription_change_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admins can create own requests"
ON public.subscription_change_requests FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Tenant admins can read own requests"
ON public.subscription_change_requests FOR SELECT TO authenticated
USING (company_id = get_my_company_id() OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix 3: tenant_feature_overrides - change from public to authenticated
DROP POLICY IF EXISTS "Super admins can manage overrides" ON public.tenant_feature_overrides;
DROP POLICY IF EXISTS "Tenant admins can read own overrides" ON public.tenant_feature_overrides;

CREATE POLICY "Super admins can manage overrides"
ON public.tenant_feature_overrides FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admins can read own overrides"
ON public.tenant_feature_overrides FOR SELECT TO authenticated
USING (company_id = get_my_company_id());

-- Fix 4: usage_tracking - change from public to authenticated
DROP POLICY IF EXISTS "Super admins can manage usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Tenant can read own usage" ON public.usage_tracking;

CREATE POLICY "Super admins can manage usage"
ON public.usage_tracking FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant can read own usage"
ON public.usage_tracking FOR SELECT TO authenticated
USING (company_id = get_my_company_id());

-- Fix 5: plan_features - change from public to authenticated  
DROP POLICY IF EXISTS "Anyone can read plan_features" ON public.plan_features;
DROP POLICY IF EXISTS "Super admins can manage plan_features" ON public.plan_features;

CREATE POLICY "Anyone can read plan_features"
ON public.plan_features FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Super admins can manage plan_features"
ON public.plan_features FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix 6: business_audit_logs - allow all business portal roles to insert
DROP POLICY IF EXISTS "Business admins can insert audit" ON public.business_audit_logs;

CREATE POLICY "Business portal roles can insert audit"
ON public.business_audit_logs FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'business_admin'::app_role) OR
  has_role(auth.uid(), 'finance_manager'::app_role) OR
  has_role(auth.uid(), 'support_agent'::app_role) OR
  has_role(auth.uid(), 'sales_manager'::app_role) OR
  has_role(auth.uid(), 'technical_admin'::app_role)
);

-- Fix 7: business_audit_logs SELECT - allow all business portal roles to view
DROP POLICY IF EXISTS "Business admins can view audit" ON public.business_audit_logs;

CREATE POLICY "Business portal roles can view audit"
ON public.business_audit_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'business_admin'::app_role) OR
  has_role(auth.uid(), 'finance_manager'::app_role) OR
  has_role(auth.uid(), 'support_agent'::app_role) OR
  has_role(auth.uid(), 'sales_manager'::app_role) OR
  has_role(auth.uid(), 'technical_admin'::app_role)
);

-- Fix 8: platform_features readable by all authenticated (for feature gating)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_features' AND policyname = 'Anyone can read platform features') THEN
    CREATE POLICY "Anyone can read platform features"
    ON public.platform_features FOR SELECT TO authenticated
    USING (true);
  END IF;
END $$;

-- Fix 9: system_document_templates needs super_admin management policy
DROP POLICY IF EXISTS "Super admins manage system templates" ON public.system_document_templates;
CREATE POLICY "Super admins manage system templates"
ON public.system_document_templates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix 10: platform_settings readable by all authenticated (for feature gating)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'Authenticated can read platform settings') THEN
    CREATE POLICY "Authenticated can read platform settings"
    ON public.platform_settings FOR SELECT TO authenticated
    USING (true);
  END IF;
END $$;