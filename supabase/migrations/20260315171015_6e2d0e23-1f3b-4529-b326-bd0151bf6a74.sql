
-- AI Packages table (business-managed)
CREATE TABLE public.ai_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ar text,
  description text,
  monthly_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  monthly_request_limit int NOT NULL DEFAULT 50,
  monthly_token_limit int NOT NULL DEFAULT 100000,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  icon text DEFAULT 'sparkles',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AI Package Features (which features each package includes)
CREATE TABLE public.ai_package_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES public.ai_packages(id) ON DELETE CASCADE NOT NULL,
  feature_key text NOT NULL,
  included boolean NOT NULL DEFAULT false,
  UNIQUE(package_id, feature_key)
);

-- Tenant AI Subscription (links tenant to a package)
CREATE TABLE public.tenant_ai_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  package_id uuid REFERENCES public.ai_packages(id) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_ai_subscription ENABLE ROW LEVEL SECURITY;

-- ai_packages: readable by all authenticated, managed by super_admin
CREATE POLICY "Anyone can view packages" ON public.ai_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage packages" ON public.ai_packages FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ai_package_features: readable by all authenticated, managed by super_admin
CREATE POLICY "Anyone can view package features" ON public.ai_package_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage package features" ON public.ai_package_features FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- tenant_ai_subscription: tenant can view own, super_admin manages all
CREATE POLICY "Tenants view own subscription" ON public.tenant_ai_subscription FOR SELECT TO authenticated USING (company_id = get_my_company_id());
CREATE POLICY "Super admins manage subscriptions" ON public.tenant_ai_subscription FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default packages
INSERT INTO public.ai_packages (slug, name, name_ar, monthly_price, monthly_request_limit, monthly_token_limit, sort_order, icon) VALUES
  ('essentials', 'AI Essentials', 'أساسيات AI', 0, 50, 100000, 1, 'sparkles'),
  ('talent', 'AI Talent', 'AI المواهب', 49, 200, 500000, 2, 'zap'),
  ('growth', 'AI Growth', 'AI النمو', 149, 500, 1500000, 3, 'rocket'),
  ('enterprise', 'AI Enterprise', 'AI المؤسسات', 499, 2000, 5000000, 4, 'crown');

-- Seed package features
INSERT INTO public.ai_package_features (package_id, feature_key, included)
SELECT p.id, f.key, f.inc FROM public.ai_packages p
CROSS JOIN (VALUES
  ('ai_hr_assistant', 'essentials', true), ('ai_workforce_analytics', 'essentials', true),
  ('ai_recruitment_intelligence', 'essentials', false), ('ai_gap_analysis', 'essentials', false),
  ('ai_planning_advisor', 'essentials', false), ('ai_employee_career_coach', 'essentials', false),
  ('ai_hr_assistant', 'talent', true), ('ai_workforce_analytics', 'talent', true),
  ('ai_recruitment_intelligence', 'talent', true), ('ai_gap_analysis', 'talent', false),
  ('ai_planning_advisor', 'talent', false), ('ai_employee_career_coach', 'talent', false),
  ('ai_hr_assistant', 'growth', true), ('ai_workforce_analytics', 'growth', true),
  ('ai_recruitment_intelligence', 'growth', true), ('ai_gap_analysis', 'growth', true),
  ('ai_planning_advisor', 'growth', true), ('ai_employee_career_coach', 'growth', true),
  ('ai_hr_assistant', 'enterprise', true), ('ai_workforce_analytics', 'enterprise', true),
  ('ai_recruitment_intelligence', 'enterprise', true), ('ai_gap_analysis', 'enterprise', true),
  ('ai_planning_advisor', 'enterprise', true), ('ai_employee_career_coach', 'enterprise', true)
) AS f(key, slug, inc)
WHERE p.slug = f.slug;

-- Update get_my_ai_entitlements to add visibility fields and use package features from DB
CREATE OR REPLACE FUNCTION public.get_my_ai_entitlements()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_roles TEXT[];
  v_package TEXT;
  v_quota_used INT;
  v_quota_limit INT;
  v_token_used INT;
  v_token_limit INT;
  v_cycle_start DATE;
  v_tenant_features RECORD;
  v_user_overrides RECORD;
  v_result JSONB;
  v_features JSONB;
  v_ai_enabled BOOLEAN;
  v_pkg_features JSONB;
  v_show_employee_ai BOOLEAN;
  v_career_coach_enabled BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT company_id INTO v_company_id FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_company');
  END IF;

  SELECT array_agg(role::text) INTO v_roles FROM public.user_roles WHERE user_id = v_user_id;
  v_roles := COALESCE(v_roles, ARRAY[]::TEXT[]);

  -- Get quota
  SELECT package, requests_used, monthly_request_limit, tokens_used, monthly_token_limit, billing_cycle_start
  INTO v_package, v_quota_used, v_quota_limit, v_token_used, v_token_limit, v_cycle_start
  FROM public.tenant_ai_quotas WHERE company_id = v_company_id;

  v_package := COALESCE(v_package, 'essentials');
  v_quota_used := COALESCE(v_quota_used, 0);
  v_quota_limit := COALESCE(v_quota_limit, 50);
  v_token_used := COALESCE(v_token_used, 0);
  v_token_limit := COALESCE(v_token_limit, 100000);

  IF v_cycle_start IS NOT NULL AND (CURRENT_DATE - v_cycle_start) >= 30 THEN
    v_quota_used := 0;
    v_token_used := 0;
  END IF;

  -- Build package feature map from DB
  SELECT COALESCE(jsonb_object_agg(pf.feature_key, pf.included), '{}'::jsonb)
  INTO v_pkg_features
  FROM public.ai_package_features pf
  JOIN public.ai_packages ap ON ap.id = pf.package_id
  WHERE ap.slug = v_package AND ap.is_active = true;

  SELECT * INTO v_tenant_features FROM public.tenant_ai_features WHERE company_id = v_company_id;
  SELECT * INTO v_user_overrides FROM public.user_ai_overrides WHERE user_id = v_user_id AND company_id = v_company_id;

  v_ai_enabled := COALESCE(v_user_overrides.ai_enabled, TRUE);

  -- Build features with package-aware resolution: user_override > tenant > package_default(from DB)
  v_features := jsonb_build_object();

  -- Helper macro-style for each feature
  v_features := v_features || jsonb_build_object('ai_hr_assistant', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_hr_assistant,
      CASE WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_hr_assistant IS NOT NULL THEN (v_tenant_features.ai_hr_assistant)::boolean
      ELSE COALESCE((v_pkg_features->>'ai_hr_assistant')::boolean, TRUE) END),
    'source', CASE
      WHEN v_user_overrides.ai_hr_assistant IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_hr_assistant IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END,
    'in_package', COALESCE((v_pkg_features->>'ai_hr_assistant')::boolean, FALSE)
  ));

  v_features := v_features || jsonb_build_object('ai_workforce_analytics', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_workforce_analytics,
      CASE WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_workforce_analytics IS NOT NULL THEN (v_tenant_features.ai_workforce_analytics)::boolean
      ELSE COALESCE((v_pkg_features->>'ai_workforce_analytics')::boolean, TRUE) END),
    'source', CASE
      WHEN v_user_overrides.ai_workforce_analytics IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_workforce_analytics IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END,
    'in_package', COALESCE((v_pkg_features->>'ai_workforce_analytics')::boolean, FALSE)
  ));

  v_features := v_features || jsonb_build_object('ai_recruitment_intelligence', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_recruitment_intelligence,
      CASE WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_recruitment_intelligence IS NOT NULL THEN (v_tenant_features.ai_recruitment_intelligence)::boolean
      ELSE COALESCE((v_pkg_features->>'ai_recruitment_intelligence')::boolean, FALSE) END),
    'source', CASE
      WHEN v_user_overrides.ai_recruitment_intelligence IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_recruitment_intelligence IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END,
    'in_package', COALESCE((v_pkg_features->>'ai_recruitment_intelligence')::boolean, FALSE)
  ));

  v_features := v_features || jsonb_build_object('ai_gap_analysis', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_gap_analysis,
      CASE WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_gap_analysis IS NOT NULL THEN (v_tenant_features.ai_gap_analysis)::boolean
      ELSE COALESCE((v_pkg_features->>'ai_gap_analysis')::boolean, FALSE) END),
    'source', CASE
      WHEN v_user_overrides.ai_gap_analysis IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_gap_analysis IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END,
    'in_package', COALESCE((v_pkg_features->>'ai_gap_analysis')::boolean, FALSE)
  ));

  v_features := v_features || jsonb_build_object('ai_planning_advisor', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_planning_advisor,
      CASE WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_planning_advisor IS NOT NULL THEN (v_tenant_features.ai_planning_advisor)::boolean
      ELSE COALESCE((v_pkg_features->>'ai_planning_advisor')::boolean, FALSE) END),
    'source', CASE
      WHEN v_user_overrides.ai_planning_advisor IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_planning_advisor IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END,
    'in_package', COALESCE((v_pkg_features->>'ai_planning_advisor')::boolean, FALSE)
  ));

  v_features := v_features || jsonb_build_object('ai_employee_career_coach', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_employee_career_coach,
      CASE WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_employee_career_coach IS NOT NULL THEN (v_tenant_features.ai_employee_career_coach)::boolean
      ELSE COALESCE((v_pkg_features->>'ai_employee_career_coach')::boolean, FALSE) END),
    'source', CASE
      WHEN v_user_overrides.ai_employee_career_coach IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_employee_career_coach IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END,
    'in_package', COALESCE((v_pkg_features->>'ai_employee_career_coach')::boolean, FALSE)
  ));

  -- Determine career coach enabled state for visibility
  v_career_coach_enabled := COALESCE(
    (v_features->'ai_employee_career_coach'->>'enabled')::boolean, FALSE
  );
  -- Show employee AI menu if career coach is in package OR tenant explicitly enabled it
  v_show_employee_ai := COALESCE((v_pkg_features->>'ai_employee_career_coach')::boolean, FALSE)
    OR (v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_employee_career_coach = TRUE)
    OR v_career_coach_enabled;

  v_features := v_features || jsonb_build_object('role_access', jsonb_build_object(
    'roles', to_jsonb(v_roles),
    'is_admin', (v_roles && ARRAY['admin','tenant_admin','super_admin']),
    'is_hr', (v_roles && ARRAY['hr_manager','hr_officer']),
    'is_manager', (v_roles && ARRAY['manager']),
    'is_employee_only', (v_roles = ARRAY['employee'])
  ));

  v_result := jsonb_build_object(
    'ai_enabled', v_ai_enabled,
    'package', v_package,
    'quota', jsonb_build_object(
      'requests_used', v_quota_used,
      'requests_limit', v_quota_limit,
      'tokens_used', v_token_used,
      'tokens_limit', v_token_limit,
      'percent_used', CASE WHEN v_quota_limit > 0 THEN round((v_quota_used::numeric / v_quota_limit) * 100, 1) ELSE 0 END
    ),
    'features', v_features,
    'show_employee_ai_menu', v_show_employee_ai,
    'show_employee_ai_page', v_show_employee_ai
  );

  RETURN v_result;
END;
$$;
