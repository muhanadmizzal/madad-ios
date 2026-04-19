
-- Add reviewed_at to subscription_change_requests
ALTER TABLE public.subscription_change_requests 
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Add requested_addons jsonb for addon change requests
ALTER TABLE public.subscription_change_requests
  ADD COLUMN IF NOT EXISTS requested_addons jsonb DEFAULT '[]'::jsonb;

-- ================================================
-- preview_tenant_bill RPC
-- ================================================
CREATE OR REPLACE FUNCTION public.preview_tenant_bill(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_ai_pkg RECORD;
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_addon RECORD;
  v_usage RECORD;
  v_base_price numeric;
  v_ai_price numeric;
BEGIN
  -- Get active subscription
  SELECT * INTO v_sub FROM tenant_subscriptions 
    WHERE company_id = p_company_id AND status IN ('active', 'trial')
    ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'billing_cycle', 'monthly', 'status', 'no_subscription');
  END IF;

  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_sub.plan_id;

  -- Base plan price
  v_base_price := CASE v_sub.billing_cycle
    WHEN 'yearly' THEN COALESCE(v_sub.custom_yearly_price, v_plan.price_yearly) / 12
    ELSE COALESCE(v_sub.custom_monthly_price, v_plan.price_monthly)
  END;

  v_items := v_items || jsonb_build_array(jsonb_build_object(
    'type', 'subscription', 'description', v_plan.name || ' (' || v_plan.name_ar || ')',
    'amount', v_base_price, 'quantity', 1
  ));
  v_total := v_total + v_base_price;

  -- AI package
  IF v_sub.ai_package_id IS NOT NULL THEN
    SELECT * INTO v_ai_pkg FROM ai_packages WHERE id = v_sub.ai_package_id AND is_active = true;
    IF FOUND THEN
      v_ai_price := CASE v_sub.billing_cycle
        WHEN 'yearly' THEN v_ai_pkg.yearly_price / 12
        ELSE v_ai_pkg.monthly_price
      END;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'type', 'ai_package', 'description', 'AI: ' || v_ai_pkg.name,
        'amount', v_ai_price, 'quantity', 1
      ));
      v_total := v_total + v_ai_price;
    END IF;
  END IF;

  -- Add-ons
  FOR v_addon IN SELECT * FROM tenant_addons WHERE company_id = p_company_id AND status = 'active' LOOP
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'addon', 'description', COALESCE(v_addon.addon_key, 'Add-on'),
      'amount', COALESCE(v_addon.custom_price, 0), 'quantity', 1
    ));
    v_total := v_total + COALESCE(v_addon.custom_price, 0);
  END LOOP;

  -- Usage-based charges (current period)
  FOR v_usage IN 
    SELECT usage_type, SUM(amount) as total_amount 
    FROM usage_tracking 
    WHERE company_id = p_company_id 
      AND period = to_char(CURRENT_DATE, 'YYYY-MM')
    GROUP BY usage_type
  LOOP
    -- Only add if there's a cost (placeholder for metered billing)
    NULL;
  END LOOP;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'billing_cycle', v_sub.billing_cycle,
    'status', v_sub.status,
    'plan', v_plan.name,
    'plan_ar', v_plan.name_ar,
    'ai_package', COALESCE(v_ai_pkg.name, null),
    'start_date', v_sub.start_date,
    'end_date', v_sub.end_date,
    'currency', v_plan.currency
  );
END;
$$;

-- ================================================
-- approve_subscription_change RPC
-- ================================================
CREATE OR REPLACE FUNCTION public.approve_subscription_change(
  p_request_id uuid,
  p_action text DEFAULT 'approved'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_req RECORD;
  v_old_sub RECORD;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Only platform admins
  IF NOT (has_role(v_actor, 'super_admin') OR has_role(v_actor, 'business_admin')) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT * INTO v_req FROM subscription_change_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Request already processed'; END IF;

  -- Update request
  UPDATE subscription_change_requests SET
    status = p_action,
    reviewed_by = v_actor,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  IF p_action = 'approved' THEN
    -- Get current subscription for audit
    SELECT * INTO v_old_sub FROM tenant_subscriptions
      WHERE company_id = v_req.company_id AND status = 'active'
      ORDER BY created_at DESC LIMIT 1;

    -- Update subscription
    UPDATE tenant_subscriptions SET
      plan_id = COALESCE(v_req.requested_plan_id, plan_id),
      ai_package_id = v_req.requested_ai_package_id,
      billing_cycle = v_req.billing_cycle,
      updated_at = now()
    WHERE company_id = v_req.company_id AND status = 'active';

    -- Audit
    INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id, before_state, after_state)
    VALUES (v_actor, 'subscription_change_approved', 'subscription_change_request', p_request_id::text, v_req.company_id,
      jsonb_build_object('plan_id', v_old_sub.plan_id, 'ai_package_id', v_old_sub.ai_package_id),
      jsonb_build_object('plan_id', COALESCE(v_req.requested_plan_id, v_old_sub.plan_id), 'ai_package_id', v_req.requested_ai_package_id)
    );
  ELSE
    INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id)
    VALUES (v_actor, 'subscription_change_rejected', 'subscription_change_request', p_request_id::text, v_req.company_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action, 'company_id', v_req.company_id);
END;
$$;

-- ================================================
-- generate_tenant_invoice RPC
-- ================================================
CREATE OR REPLACE FUNCTION public.generate_tenant_invoice(
  p_company_id uuid,
  p_billing_period text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Only platform admins
  IF NOT (has_role(v_actor, 'super_admin') OR has_role(v_actor, 'business_admin') OR has_role(v_actor, 'finance_manager')) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Use preview_tenant_bill for consistent pricing
  v_bill := preview_tenant_bill(p_company_id);
  v_items := v_bill->'items';
  v_total := (v_bill->>'total')::numeric;
  v_currency := COALESCE(v_bill->>'currency', 'USD');

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No billable amount');
  END IF;

  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMM') || '-' || LPAD(floor(random() * 9999 + 1)::text, 4, '0');
  v_due_date := (CURRENT_DATE + interval '30 days')::date;

  SELECT * INTO v_sub FROM tenant_subscriptions
    WHERE company_id = p_company_id AND status = 'active' LIMIT 1;

  -- Create invoice
  INSERT INTO billing_invoices (company_id, subscription_id, invoice_number, amount, currency, status, due_date)
  VALUES (p_company_id, v_sub.id, v_invoice_number, v_total, v_currency, 'pending', v_due_date)
  RETURNING id INTO v_invoice_id;

  -- Create line items from the bill preview
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    INSERT INTO invoice_items (invoice_id, item_type, description, amount, quantity)
    VALUES (v_invoice_id, v_item->>'type', v_item->>'description', (v_item->>'amount')::numeric, (v_item->>'quantity')::int);
  END LOOP;

  -- Audit
  INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id, after_state)
  VALUES (v_actor, 'invoice_generated', 'billing_invoice', v_invoice_id::text, p_company_id,
    jsonb_build_object('invoice_number', v_invoice_number, 'amount', v_total, 'items_count', jsonb_array_length(v_items))
  );

  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'invoice_number', v_invoice_number, 'amount', v_total);
END;
$$;

-- ================================================
-- get_tenant_usage_summary RPC
-- ================================================
CREATE OR REPLACE FUNCTION public.get_tenant_usage_summary(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp_count int;
  v_branch_count int;
  v_ai_requests numeric;
  v_ai_tokens numeric;
  v_period text;
  v_plan RECORD;
  v_sub RECORD;
BEGIN
  v_period := to_char(CURRENT_DATE, 'YYYY-MM');

  SELECT count(*) INTO v_emp_count FROM employees WHERE company_id = p_company_id AND status = 'active';
  SELECT count(*) INTO v_branch_count FROM branches WHERE company_id = p_company_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_ai_requests
    FROM usage_tracking WHERE company_id = p_company_id AND usage_type = 'ai_requests' AND period = v_period;
  SELECT COALESCE(SUM(amount), 0) INTO v_ai_tokens
    FROM usage_tracking WHERE company_id = p_company_id AND usage_type = 'ai_tokens' AND period = v_period;

  SELECT ts.*, sp.max_employees, sp.max_branches, sp.max_storage_gb, sp.max_ai_requests
  INTO v_sub
  FROM tenant_subscriptions ts
  JOIN subscription_plans sp ON sp.id = ts.plan_id
  WHERE ts.company_id = p_company_id AND ts.status = 'active'
  ORDER BY ts.created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'period', v_period,
    'employees', jsonb_build_object('used', v_emp_count, 'limit', COALESCE(v_sub.max_employees, 0), 'over_limit', v_emp_count > COALESCE(v_sub.max_employees, 99999)),
    'branches', jsonb_build_object('used', v_branch_count, 'limit', COALESCE(v_sub.max_branches, 0), 'over_limit', v_branch_count > COALESCE(v_sub.max_branches, 999)),
    'ai_requests', jsonb_build_object('used', v_ai_requests, 'limit', COALESCE(v_sub.max_ai_requests, 0)),
    'ai_tokens', jsonb_build_object('used', v_ai_tokens, 'limit', 0)
  );
END;
$$;
