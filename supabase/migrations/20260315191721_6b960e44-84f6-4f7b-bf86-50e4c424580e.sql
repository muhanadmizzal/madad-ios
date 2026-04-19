
-- 1. get_feature_access: unified per-feature access resolver
CREATE OR REPLACE FUNCTION public.get_feature_access(p_company_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_ai_pkg RECORD;
  v_result jsonb := '{}'::jsonb;
  v_feat RECORD;
  v_override RECORD;
  v_ai_feat RECORD;
  v_sub_status text;
  v_user_roles text[] := ARRAY[]::text[];
  v_is_admin boolean := false;
  v_usage_employees int := 0;
  v_usage_branches int := 0;
  v_usage_ai int := 0;
  v_limits jsonb := '{}'::jsonb;
  v_entry jsonb;
BEGIN
  -- Get subscription
  SELECT * INTO v_sub FROM tenant_subscriptions 
    WHERE company_id = p_company_id AND status IN ('active','trial')
    ORDER BY created_at DESC LIMIT 1;

  v_sub_status := COALESCE(v_sub.status, 'no_subscription');

  -- Check for suspended/cancelled/overdue  
  IF NOT FOUND THEN
    SELECT status INTO v_sub_status FROM tenant_subscriptions
      WHERE company_id = p_company_id ORDER BY created_at DESC LIMIT 1;
    v_sub_status := COALESCE(v_sub_status, 'no_subscription');
  END IF;

  -- If subscription inactive, return all features locked
  IF v_sub_status NOT IN ('active', 'trial') THEN
    RETURN jsonb_build_object(
      'status', v_sub_status,
      'features', '{}'::jsonb,
      'limits', '{}'::jsonb,
      'message', CASE v_sub_status
        WHEN 'suspended' THEN 'subscription_suspended'
        WHEN 'cancelled' THEN 'subscription_cancelled'
        WHEN 'overdue' THEN 'subscription_overdue'
        WHEN 'pending' THEN 'subscription_pending'
        ELSE 'no_subscription'
      END
    );
  END IF;

  -- Get plan
  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_sub.plan_id;

  -- Get AI package
  IF v_sub.ai_package_id IS NOT NULL THEN
    SELECT * INTO v_ai_pkg FROM ai_packages WHERE id = v_sub.ai_package_id AND is_active = true;
  END IF;

  -- Get user roles if provided
  IF p_user_id IS NOT NULL THEN
    SELECT array_agg(role::text) INTO v_user_roles FROM user_roles WHERE user_id = p_user_id;
    v_user_roles := COALESCE(v_user_roles, ARRAY[]::text[]);
    v_is_admin := v_user_roles && ARRAY['admin','tenant_admin','super_admin','hr_manager'];
  END IF;

  -- Build limits
  v_limits := jsonb_build_object(
    'employees', COALESCE(v_plan.max_employees, 0),
    'branches', COALESCE(v_plan.max_branches, 0),
    'storage_gb', COALESCE(v_plan.max_storage_gb, 0),
    'ai_requests', COALESCE(v_plan.max_ai_requests, COALESCE(v_ai_pkg.monthly_request_limit, 0))
  );

  -- Get current usage
  SELECT count(*) INTO v_usage_employees FROM employees WHERE company_id = p_company_id AND status = 'active';
  SELECT count(*) INTO v_usage_branches FROM branches WHERE company_id = p_company_id;
  SELECT COALESCE(SUM(amount), 0)::int INTO v_usage_ai FROM usage_tracking 
    WHERE company_id = p_company_id AND usage_type = 'ai_requests' AND period = to_char(CURRENT_DATE, 'YYYY-MM');

  -- Build plan features
  FOR v_feat IN SELECT * FROM plan_features WHERE plan_id = v_sub.plan_id LOOP
    v_entry := jsonb_build_object(
      'enabled', v_feat.included,
      'source', 'plan',
      'reason', CASE WHEN NOT v_feat.included THEN 'not_in_plan' ELSE null END
    );
    v_result := v_result || jsonb_build_object(v_feat.feature_key, v_entry);
  END LOOP;

  -- Apply AI package features
  IF v_ai_pkg.id IS NOT NULL THEN
    FOR v_ai_feat IN SELECT * FROM ai_package_features WHERE package_id = v_ai_pkg.id LOOP
      v_entry := jsonb_build_object(
        'enabled', v_ai_feat.included,
        'source', 'ai_package',
        'reason', CASE WHEN NOT v_ai_feat.included THEN 'not_in_plan' ELSE null END
      );
      v_result := v_result || jsonb_build_object(v_ai_feat.feature_key, v_entry);
    END LOOP;
  END IF;

  -- Apply tenant overrides (highest priority)
  FOR v_override IN SELECT * FROM tenant_feature_overrides WHERE company_id = p_company_id LOOP
    v_entry := jsonb_build_object(
      'enabled', v_override.enabled,
      'source', CASE WHEN v_override.enabled THEN 'tenant_override' ELSE 'disabled_by_admin' END,
      'reason', CASE WHEN NOT v_override.enabled THEN 'disabled_by_admin' ELSE null END
    );
    v_result := v_result || jsonb_build_object(v_override.feature_key, v_entry);
  END LOOP;

  -- Check quota-based features
  IF v_usage_employees > COALESCE(v_plan.max_employees, 99999) THEN
    v_entry := v_result->'hr_core';
    IF v_entry IS NOT NULL THEN
      v_result := v_result || jsonb_build_object('hr_core', v_entry || jsonb_build_object('quota_exceeded', true, 'quota_detail', 'employees'));
    END IF;
  END IF;

  IF v_ai_pkg.monthly_request_limit IS NOT NULL AND v_usage_ai > v_ai_pkg.monthly_request_limit THEN
    -- Mark all AI features as quota exceeded
    FOR v_ai_feat IN SELECT feature_key FROM ai_package_features WHERE package_id = v_ai_pkg.id AND included = true LOOP
      v_entry := COALESCE(v_result->v_ai_feat.feature_key, '{}'::jsonb);
      v_result := v_result || jsonb_build_object(v_ai_feat.feature_key, v_entry || jsonb_build_object('quota_exceeded', true, 'quota_detail', 'ai_requests'));
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'status', v_sub_status,
    'plan', v_plan.name,
    'plan_id', v_sub.plan_id,
    'ai_package', COALESCE(v_ai_pkg.name, null),
    'features', v_result,
    'limits', v_limits,
    'usage', jsonb_build_object(
      'employees', v_usage_employees,
      'branches', v_usage_branches,
      'ai_requests', v_usage_ai
    ),
    'roles', to_jsonb(v_user_roles),
    'is_admin', v_is_admin
  );
END;
$function$;

-- 2. Make generate_tenant_invoice idempotent with billing_period
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS billing_period text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_invoices_company_period 
  ON public.billing_invoices (company_id, billing_period) 
  WHERE billing_period IS NOT NULL AND status != 'cancelled';

-- Update generate_tenant_invoice to be period-aware and idempotent
CREATE OR REPLACE FUNCTION public.generate_tenant_invoice(p_company_id uuid, p_billing_period text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_bill jsonb;
  v_items jsonb;
  v_total numeric;
  v_invoice_id uuid;
  v_invoice_number text;
  v_due_date date;
  v_sub RECORD;
  v_item jsonb;
  v_currency text;
  v_period text;
  v_existing_id uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT (has_role(v_actor, 'super_admin') OR has_role(v_actor, 'business_admin') OR has_role(v_actor, 'finance_manager')) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  v_period := COALESCE(p_billing_period, to_char(CURRENT_DATE, 'YYYY-MM'));

  -- Idempotency check
  SELECT id INTO v_existing_id FROM billing_invoices 
    WHERE company_id = p_company_id AND billing_period = v_period AND status != 'cancelled';
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice already exists for this period', 'existing_invoice_id', v_existing_id);
  END IF;

  v_bill := preview_tenant_bill(p_company_id);
  v_items := v_bill->'items';
  v_total := (v_bill->>'total')::numeric;
  v_currency := COALESCE(v_bill->>'currency', 'USD');

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No billable amount');
  END IF;

  v_invoice_number := 'INV-' || replace(v_period, '-', '') || '-' || LPAD(floor(random() * 9999 + 1)::text, 4, '0');
  v_due_date := (CURRENT_DATE + interval '30 days')::date;

  SELECT * INTO v_sub FROM tenant_subscriptions
    WHERE company_id = p_company_id AND status = 'active' LIMIT 1;

  INSERT INTO billing_invoices (company_id, subscription_id, invoice_number, amount, currency, status, due_date, billing_period)
  VALUES (p_company_id, v_sub.id, v_invoice_number, v_total, v_currency, 'pending', v_due_date, v_period)
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    INSERT INTO invoice_items (invoice_id, item_type, description, amount, quantity)
    VALUES (v_invoice_id, v_item->>'type', v_item->>'description', (v_item->>'amount')::numeric, (v_item->>'quantity')::int);
  END LOOP;

  INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id, after_state)
  VALUES (v_actor, 'invoice_generated', 'billing_invoice', v_invoice_id::text, p_company_id,
    jsonb_build_object('invoice_number', v_invoice_number, 'amount', v_total, 'period', v_period));

  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'invoice_number', v_invoice_number, 'amount', v_total, 'period', v_period);
END;
$function$;

-- 3. Add-on requests table for tenant-initiated add-on requests
CREATE TABLE IF NOT EXISTS public.addon_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  addon_key text NOT NULL,
  requested_price numeric,
  billing_cycle text DEFAULT 'monthly',
  notes text,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view own addon requests" ON public.addon_requests
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant admins can insert addon requests" ON public.addon_requests
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all addon requests" ON public.addon_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'business_admin'));

-- 4. approve_addon_request RPC
CREATE OR REPLACE FUNCTION public.approve_addon_request(p_request_id uuid, p_action text DEFAULT 'approved', p_custom_price numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_req RECORD;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(v_actor, 'super_admin') OR has_role(v_actor, 'business_admin')) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT * INTO v_req FROM addon_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Request already processed'; END IF;

  UPDATE addon_requests SET status = p_action, reviewed_by = v_actor, reviewed_at = now(), updated_at = now()
  WHERE id = p_request_id;

  IF p_action = 'approved' THEN
    INSERT INTO tenant_addons (company_id, addon_key, status, custom_price, billing_cycle)
    VALUES (v_req.company_id, v_req.addon_key, 'active', COALESCE(p_custom_price, v_req.requested_price), v_req.billing_cycle)
    ON CONFLICT DO NOTHING;

    INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id, after_state)
    VALUES (v_actor, 'addon_approved', 'addon_request', p_request_id::text, v_req.company_id,
      jsonb_build_object('addon_key', v_req.addon_key, 'price', COALESCE(p_custom_price, v_req.requested_price)));
  ELSE
    INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id)
    VALUES (v_actor, 'addon_rejected', 'addon_request', p_request_id::text, v_req.company_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$function$;
