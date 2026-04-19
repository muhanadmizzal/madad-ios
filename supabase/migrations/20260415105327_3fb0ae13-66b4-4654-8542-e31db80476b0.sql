CREATE OR REPLACE FUNCTION public.get_platform_revenue_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mrr numeric := 0;
  v_madad_mrr numeric := 0;
  v_arr numeric := 0;
  v_active_subs int := 0;
  v_madad_active int := 0;
  v_overdue_total numeric := 0;
  v_paid_30d numeric := 0;
  v_pending_total numeric := 0;
BEGIN
  -- MRR from tenant_subscriptions (legacy)
  SELECT COALESCE(SUM(
    CASE
      WHEN ts.billing_cycle = 'yearly' THEN
        COALESCE(ts.custom_yearly_price, sp.price_yearly) / 12.0
      ELSE
        COALESCE(ts.custom_monthly_price, sp.price_monthly)
    END
  ), 0), COUNT(*)
  INTO v_mrr, v_active_subs
  FROM tenant_subscriptions ts
  JOIN subscription_plans sp ON sp.id = ts.plan_id
  WHERE ts.status IN ('active', 'trial');

  -- MRR from madad_tenant_subscriptions (package-based)
  SELECT COALESCE(SUM(
    CASE
      WHEN mts.billing_cycle = 'yearly' THEN
        COALESCE(mts.custom_price, mp.yearly_price) / 12.0
      ELSE
        COALESCE(mts.custom_price, mp.monthly_price)
    END
  ), 0), COUNT(*)
  INTO v_madad_mrr, v_madad_active
  FROM madad_tenant_subscriptions mts
  JOIN madad_packages mp ON mp.id = mts.package_id
  WHERE mts.status IN ('active', 'trial');

  -- Combine (avoid double-counting companies with both)
  v_mrr := v_mrr + v_madad_mrr;
  v_active_subs := v_active_subs + v_madad_active;
  v_arr := v_mrr * 12;

  -- Overdue invoices
  SELECT COALESCE(SUM(amount), 0) INTO v_overdue_total
  FROM billing_invoices WHERE status = 'overdue';

  -- Paid last 30 days
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_30d
  FROM billing_invoices WHERE status = 'paid' AND paid_at >= now() - interval '30 days';

  -- Pending
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_total
  FROM billing_invoices WHERE status = 'pending';

  RETURN jsonb_build_object(
    'mrr', v_mrr,
    'arr', v_arr,
    'active_subscriptions', v_active_subs,
    'overdue_total', v_overdue_total,
    'paid_last_30d', v_paid_30d,
    'pending_total', v_pending_total
  );
END;
$$;