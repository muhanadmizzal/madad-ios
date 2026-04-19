
-- User AI overrides table for per-user AI feature control
CREATE TABLE public.user_ai_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ai_hr_assistant BOOLEAN,
  ai_workforce_analytics BOOLEAN,
  ai_recruitment_intelligence BOOLEAN,
  ai_gap_analysis BOOLEAN,
  ai_planning_advisor BOOLEAN,
  ai_employee_career_coach BOOLEAN,
  ai_enabled BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.user_ai_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user AI overrides"
  ON public.user_ai_overrides FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager')));

CREATE POLICY "Users can view own AI overrides"
  ON public.user_ai_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND company_id = public.get_my_company_id());

-- Entitlements resolver function
CREATE OR REPLACE FUNCTION public.get_my_ai_entitlements()
RETURNS JSONB
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Get company
  SELECT company_id INTO v_company_id FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_company');
  END IF;

  -- Get roles
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

  -- Reset if cycle expired
  IF v_cycle_start IS NOT NULL AND (CURRENT_DATE - v_cycle_start) >= 30 THEN
    v_quota_used := 0;
    v_token_used := 0;
  END IF;

  -- Get tenant feature flags
  SELECT * INTO v_tenant_features FROM public.tenant_ai_features WHERE company_id = v_company_id;

  -- Get user overrides
  SELECT * INTO v_user_overrides FROM public.user_ai_overrides WHERE user_id = v_user_id AND company_id = v_company_id;

  -- Global AI enabled check
  v_ai_enabled := COALESCE(v_user_overrides.ai_enabled, TRUE);

  -- Build per-feature entitlements with source tracking
  v_features := jsonb_build_object();

  -- Helper: for each feature, resolve: user_override > tenant_flag > role_access > package_default
  -- ai_hr_assistant
  v_features := v_features || jsonb_build_object('ai_hr_assistant', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_hr_assistant, 
      CASE WHEN v_tenant_features.id IS NOT NULL THEN (v_tenant_features.ai_hr_assistant)::boolean ELSE TRUE END),
    'source', CASE 
      WHEN v_user_overrides.ai_hr_assistant IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_hr_assistant IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END
  ));

  v_features := v_features || jsonb_build_object('ai_workforce_analytics', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_workforce_analytics,
      CASE WHEN v_tenant_features.id IS NOT NULL THEN (v_tenant_features.ai_workforce_analytics)::boolean ELSE TRUE END),
    'source', CASE
      WHEN v_user_overrides.ai_workforce_analytics IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_workforce_analytics IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END
  ));

  v_features := v_features || jsonb_build_object('ai_recruitment_intelligence', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_recruitment_intelligence,
      CASE WHEN v_tenant_features.id IS NOT NULL THEN (v_tenant_features.ai_recruitment_intelligence)::boolean ELSE TRUE END),
    'source', CASE
      WHEN v_user_overrides.ai_recruitment_intelligence IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_recruitment_intelligence IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END
  ));

  v_features := v_features || jsonb_build_object('ai_gap_analysis', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_gap_analysis,
      CASE WHEN v_tenant_features.id IS NOT NULL THEN (v_tenant_features.ai_gap_analysis)::boolean ELSE TRUE END),
    'source', CASE
      WHEN v_user_overrides.ai_gap_analysis IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_gap_analysis IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END
  ));

  v_features := v_features || jsonb_build_object('ai_planning_advisor', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_planning_advisor,
      CASE WHEN v_tenant_features.id IS NOT NULL THEN (v_tenant_features.ai_planning_advisor)::boolean ELSE TRUE END),
    'source', CASE
      WHEN v_user_overrides.ai_planning_advisor IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_planning_advisor IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END
  ));

  v_features := v_features || jsonb_build_object('ai_employee_career_coach', jsonb_build_object(
    'enabled', COALESCE(v_user_overrides.ai_employee_career_coach,
      CASE WHEN v_tenant_features.id IS NOT NULL THEN (v_tenant_features.ai_employee_career_coach)::boolean ELSE TRUE END),
    'source', CASE
      WHEN v_user_overrides.ai_employee_career_coach IS NOT NULL THEN 'user_override'
      WHEN v_tenant_features.id IS NOT NULL AND v_tenant_features.ai_employee_career_coach IS NOT NULL THEN 'tenant'
      ELSE 'package_default' END
  ));

  -- Role-based access check
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
    'features', v_features
  );

  RETURN v_result;
END;
$$;
