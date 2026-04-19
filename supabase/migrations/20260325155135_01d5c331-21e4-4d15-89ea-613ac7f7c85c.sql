
-- ============================================
-- STEP 6: Billing & Subscription Hardening
-- ============================================

-- A. Add missing columns to tenant_subscriptions
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS next_billing_date date,
  ADD COLUMN IF NOT EXISTS trial_end_date date,
  ADD COLUMN IF NOT EXISTS current_price_snapshot jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS included_features_snapshot jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS included_limits_snapshot jsonb DEFAULT '{}';

-- B. Create addon_catalog table
CREATE TABLE IF NOT EXISTS public.addon_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ar text,
  description text,
  pricing_type text NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed','per_unit')),
  unit_price numeric NOT NULL DEFAULT 0,
  unit_label text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read addon_catalog" ON public.addon_catalog FOR SELECT TO authenticated USING (true);

-- Seed addon catalog
INSERT INTO public.addon_catalog (key, name, name_ar, pricing_type, unit_price, unit_label, sort_order) VALUES
  ('extra_users', 'Extra Users', 'مستخدمون إضافيون', 'per_unit', 5, 'user', 1),
  ('extra_storage', 'Extra Storage', 'تخزين إضافي', 'per_unit', 2, 'GB', 2),
  ('extra_branches', 'Extra Branches', 'فروع إضافية', 'per_unit', 10, 'branch', 3),
  ('extra_ai_tokens', 'Extra AI Tokens', 'رموز AI إضافية', 'fixed', 25, NULL, 4),
  ('advanced_reports', 'Advanced Reports', 'تقارير متقدمة', 'fixed', 15, NULL, 5)
ON CONFLICT (key) DO NOTHING;

-- C. Add period columns to billing_invoices if missing
ALTER TABLE public.billing_invoices
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS issued_date date DEFAULT CURRENT_DATE;

-- D. Subscription status transition function
CREATE OR REPLACE FUNCTION public.transition_subscription_status(
  p_subscription_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_valid_transitions jsonb := '{
    "trial": ["active","cancelled"],
    "active": ["overdue","suspended","cancelled"],
    "overdue": ["active","suspended","cancelled"],
    "suspended": ["active","cancelled"],
    "cancelled": ["active"]
  }'::jsonb;
  v_allowed text[];
BEGIN
  SELECT * INTO v_sub FROM tenant_subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'subscription_not_found');
  END IF;

  -- Check valid transition
  SELECT array_agg(value::text) INTO v_allowed
  FROM jsonb_array_elements_text(v_valid_transitions -> v_sub.status);

  IF v_allowed IS NULL OR NOT (p_new_status = ANY(v_allowed)) THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Invalid transition: %s → %s', v_sub.status, p_new_status));
  END IF;

  UPDATE tenant_subscriptions
  SET status = p_new_status,
      updated_at = now(),
      notes = COALESCE(p_reason, notes)
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object('success', true, 'from', v_sub.status, 'to', p_new_status);
END;
$$;

-- E. Snapshot subscription on activation/change
CREATE OR REPLACE FUNCTION public.snapshot_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_features jsonb;
  v_limits jsonb;
BEGIN
  SELECT * INTO v_plan FROM subscription_plans WHERE id = NEW.plan_id;

  SELECT jsonb_object_agg(feature_key, included)
  INTO v_features
  FROM plan_features WHERE plan_id = NEW.plan_id;

  v_limits := jsonb_build_object(
    'max_employees', COALESCE(v_plan.max_employees, 0),
    'max_branches', COALESCE(v_plan.max_branches, 0),
    'max_storage_gb', COALESCE(v_plan.max_storage_gb, 0)
  );

  NEW.current_price_snapshot := jsonb_build_object(
    'plan_monthly', COALESCE(v_plan.price_monthly, 0),
    'plan_yearly', COALESCE(v_plan.price_yearly, 0),
    'custom_monthly', COALESCE(NEW.custom_monthly_price, v_plan.price_monthly),
    'custom_yearly', COALESCE(NEW.custom_yearly_price, v_plan.price_yearly)
  );
  NEW.included_features_snapshot := COALESCE(v_features, '{}'::jsonb);
  NEW.included_limits_snapshot := v_limits;

  -- Set next billing date if not set
  IF NEW.next_billing_date IS NULL THEN
    IF NEW.billing_cycle = 'yearly' THEN
      NEW.next_billing_date := (NEW.start_date::date + interval '1 year')::date;
    ELSE
      NEW.next_billing_date := (NEW.start_date::date + interval '1 month')::date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_subscription ON public.tenant_subscriptions;
CREATE TRIGGER trg_snapshot_subscription
  BEFORE INSERT OR UPDATE OF plan_id, billing_cycle, status ON public.tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_subscription();

-- F. MRR calculation function
CREATE OR REPLACE FUNCTION public.get_platform_revenue_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mrr numeric := 0;
  v_arr numeric := 0;
  v_active_subs int := 0;
  v_overdue_total numeric := 0;
  v_paid_30d numeric := 0;
  v_pending_total numeric := 0;
BEGIN
  -- MRR from active subscriptions
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

-- G. Index for billing queries
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_company_due ON public.billing_invoices(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tenant_subs_status ON public.tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subs_next_billing ON public.tenant_subscriptions(next_billing_date);
