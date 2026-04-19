
-- 1. Add missing columns to subscription_plans
ALTER TABLE public.subscription_plans 
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS max_ai_requests integer DEFAULT 0;

-- 2. Create plan_features table
CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  included boolean NOT NULL DEFAULT false,
  limit_value integer,
  notes text,
  UNIQUE(plan_id, feature_key)
);
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan_features" ON public.plan_features FOR SELECT USING (true);
CREATE POLICY "Super admins can manage plan_features" ON public.plan_features FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 3. Create tenant_feature_overrides table
CREATE TABLE IF NOT EXISTS public.tenant_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  limit_override integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_key)
);
ALTER TABLE public.tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins can read own overrides" ON public.tenant_feature_overrides FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "Super admins can manage overrides" ON public.tenant_feature_overrides FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. Create subscription_change_requests table
CREATE TABLE IF NOT EXISTS public.subscription_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  current_plan_id uuid REFERENCES public.subscription_plans(id),
  requested_plan_id uuid REFERENCES public.subscription_plans(id),
  current_ai_package_id uuid REFERENCES public.ai_packages(id),
  requested_ai_package_id uuid REFERENCES public.ai_packages(id),
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  reviewed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins can create own requests" ON public.subscription_change_requests FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "Tenant admins can read own requests" ON public.subscription_change_requests FOR SELECT USING (company_id = public.get_my_company_id() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can manage requests" ON public.subscription_change_requests FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 5. Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'subscription',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can read own invoice items" ON public.invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.billing_invoices bi WHERE bi.id = invoice_id AND bi.company_id = public.get_my_company_id())
);
CREATE POLICY "Super admins can manage invoice items" ON public.invoice_items FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 6. Create usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  usage_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can read own usage" ON public.usage_tracking FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "Super admins can manage usage" ON public.usage_tracking FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 7. Add addon_key, billing_cycle, notes to tenant_addons if missing
ALTER TABLE public.tenant_addons 
  ADD COLUMN IF NOT EXISTS addon_key text,
  ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 8. Update triggers
CREATE OR REPLACE TRIGGER update_tenant_feature_overrides_updated_at
  BEFORE UPDATE ON public.tenant_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_subscription_change_requests_updated_at
  BEFORE UPDATE ON public.subscription_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tenant_addons_updated_at
  BEFORE UPDATE ON public.tenant_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Create entitlement resolver function
CREATE OR REPLACE FUNCTION public.get_tenant_entitlements(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_ai_pkg RECORD;
  v_features jsonb := '{}'::jsonb;
  v_limits jsonb;
  v_addons jsonb := '[]'::jsonb;
  v_feat RECORD;
  v_override RECORD;
BEGIN
  -- Get active subscription
  SELECT * INTO v_sub FROM public.tenant_subscriptions 
    WHERE company_id = p_company_id AND status = 'active' 
    ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('plan', null, 'ai_package', null, 'features', '{}'::jsonb, 'limits', '{}'::jsonb, 'addons', '[]'::jsonb, 'status', 'no_subscription');
  END IF;

  -- Get plan details
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_sub.plan_id;

  -- Get AI package if any
  IF v_sub.ai_package_id IS NOT NULL THEN
    SELECT * INTO v_ai_pkg FROM public.ai_packages WHERE id = v_sub.ai_package_id AND is_active = true;
  END IF;

  -- Build limits
  v_limits := jsonb_build_object(
    'employees', COALESCE(v_plan.max_employees, 0),
    'branches', COALESCE(v_plan.max_branches, 0),
    'storage_gb', COALESCE(v_plan.max_storage_gb, 0),
    'ai_requests', COALESCE(v_plan.max_ai_requests, COALESCE(v_ai_pkg.monthly_request_limit, 0))
  );

  -- Build features from plan_features
  FOR v_feat IN SELECT * FROM public.plan_features WHERE plan_id = v_sub.plan_id LOOP
    v_features := v_features || jsonb_build_object(v_feat.feature_key, v_feat.included);
  END LOOP;

  -- Apply tenant overrides
  FOR v_override IN SELECT * FROM public.tenant_feature_overrides WHERE company_id = p_company_id LOOP
    v_features := v_features || jsonb_build_object(v_override.feature_key, v_override.enabled);
    IF v_override.limit_override IS NOT NULL THEN
      v_limits := v_limits || jsonb_build_object(v_override.feature_key || '_limit', v_override.limit_override);
    END IF;
  END LOOP;

  -- Get active addons
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ta.id, 'addon_key', ta.addon_key, 'status', ta.status, 'custom_price', ta.custom_price
  )), '[]'::jsonb) INTO v_addons
  FROM public.tenant_addons ta WHERE ta.company_id = p_company_id AND ta.status = 'active';

  RETURN jsonb_build_object(
    'plan', COALESCE(v_plan.name, 'none'),
    'plan_id', v_sub.plan_id,
    'ai_package', COALESCE(v_ai_pkg.name, null),
    'ai_package_id', v_sub.ai_package_id,
    'billing_cycle', v_sub.billing_cycle,
    'status', v_sub.status,
    'start_date', v_sub.start_date,
    'end_date', v_sub.end_date,
    'features', v_features,
    'limits', v_limits,
    'addons', v_addons,
    'monthly_price', COALESCE(v_sub.custom_monthly_price, v_plan.price_monthly),
    'yearly_price', COALESCE(v_sub.custom_yearly_price, v_plan.price_yearly),
    'ai_monthly_price', COALESCE(v_ai_pkg.monthly_price, 0),
    'ai_yearly_price', COALESCE(v_ai_pkg.yearly_price, 0)
  );
END;
$$;
