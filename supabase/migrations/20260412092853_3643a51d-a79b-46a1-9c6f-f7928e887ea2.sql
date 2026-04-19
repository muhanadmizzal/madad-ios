
-- Table: madad_tenant_feature_access
-- Stores per-tenant feature access derived from MADAD package
CREATE TABLE IF NOT EXISTS public.madad_tenant_feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  module_key text NOT NULL DEFAULT 'tamkeen',
  granted_by_package_id uuid REFERENCES public.madad_packages(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_key)
);

ALTER TABLE public.madad_tenant_feature_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company feature access"
  ON public.madad_tenant_feature_access FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Admins can manage feature access"
  ON public.madad_tenant_feature_access FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- RPC: get_madad_subscription_details
-- Returns full subscription info for a tenant
CREATE OR REPLACE FUNCTION public.get_madad_subscription_details(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  sub_row record;
  pkg_row record;
  modules_arr jsonb;
  features_arr jsonb;
BEGIN
  -- Get active subscription
  SELECT * INTO sub_row
  FROM madad_tenant_subscriptions
  WHERE company_id = p_company_id AND status IN ('active', 'trial')
  ORDER BY created_at DESC LIMIT 1;

  IF sub_row IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'no_subscription',
      'package', null,
      'modules', '[]'::jsonb,
      'features', '[]'::jsonb,
      'subscription', null
    );
  END IF;

  -- Get package
  SELECT * INTO pkg_row FROM madad_packages WHERE id = sub_row.package_id;

  -- Get active modules for this tenant
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', m.key,
    'name_ar', m.name_ar,
    'name_en', m.name_en,
    'is_active', tm.is_active,
    'status', m.status
  )), '[]'::jsonb)
  INTO modules_arr
  FROM madad_tenant_modules tm
  JOIN madad_modules m ON m.id = tm.module_id
  WHERE tm.company_id = p_company_id;

  -- Get features
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'feature_key', pf.feature_key,
    'feature_label_ar', pf.feature_label_ar,
    'feature_label_en', pf.feature_label_en,
    'value', pf.value
  )), '[]'::jsonb)
  INTO features_arr
  FROM madad_package_features pf
  WHERE pf.package_id = sub_row.package_id;

  RETURN jsonb_build_object(
    'status', sub_row.status,
    'billing_cycle', sub_row.billing_cycle,
    'start_date', sub_row.start_date,
    'end_date', sub_row.end_date,
    'trial_ends_at', sub_row.trial_ends_at,
    'package', CASE WHEN pkg_row IS NOT NULL THEN jsonb_build_object(
      'id', pkg_row.id,
      'key', pkg_row.key,
      'name_ar', pkg_row.name_ar,
      'name_en', pkg_row.name_en,
      'monthly_price', pkg_row.monthly_price,
      'yearly_price', pkg_row.yearly_price,
      'currency', pkg_row.currency,
      'badge_ar', pkg_row.badge_ar,
      'badge_en', pkg_row.badge_en
    ) ELSE null END,
    'modules', modules_arr,
    'features', features_arr
  );
END;
$$;

-- RPC: get_madad_dashboard_stats
-- Cross-module aggregated metrics
CREATE OR REPLACE FUNCTION public.get_madad_dashboard_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_count int;
  dept_count int;
  branch_count int;
  booking_count int;
  active_modules int;
  pending_approvals int;
  recent_activity jsonb;
BEGIN
  -- Tamkeen metrics
  SELECT count(*) INTO emp_count FROM employees WHERE company_id = p_company_id AND status = 'active';
  SELECT count(*) INTO dept_count FROM departments WHERE company_id = p_company_id;
  SELECT count(*) INTO branch_count FROM branches WHERE company_id = p_company_id;

  -- Tathbeet metrics
  SELECT count(*) INTO booking_count FROM tathbeet_bookings WHERE company_id = p_company_id;

  -- Module count
  SELECT count(*) INTO active_modules FROM madad_tenant_modules WHERE company_id = p_company_id AND is_active = true;

  -- Pending approvals
  SELECT count(*) INTO pending_approvals FROM approval_requests WHERE company_id = p_company_id AND status = 'pending';

  -- Recent activity (last 10)
  SELECT COALESCE(jsonb_agg(row_to_json(a)::jsonb ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO recent_activity
  FROM (
    SELECT action, table_name, created_at, user_id
    FROM audit_logs
    WHERE company_id = p_company_id
    ORDER BY created_at DESC
    LIMIT 10
  ) a;

  RETURN jsonb_build_object(
    'employees', emp_count,
    'departments', dept_count,
    'branches', branch_count,
    'bookings', booking_count,
    'active_modules', active_modules,
    'pending_approvals', pending_approvals,
    'recent_activity', recent_activity
  );
END;
$$;
