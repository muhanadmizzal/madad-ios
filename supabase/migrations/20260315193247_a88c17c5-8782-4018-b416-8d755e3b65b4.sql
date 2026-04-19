-- 1. Add unique index on billing_invoices for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_invoices_company_period 
ON public.billing_invoices (company_id, billing_period) 
WHERE status != 'cancelled';

-- 2. Drop and recreate get_feature_access with full return structure
CREATE OR REPLACE FUNCTION public.get_feature_access(p_company_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_ai_pkg RECORD;
  v_features jsonb := '{}'::jsonb;
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
  v_usage jsonb := '{}'::jsonb;
  v_entry jsonb;
  v_plan_name text;
  v_ai_pkg_name text;
  v_plan_id uuid;
  v_ai_pkg_id uuid;
BEGIN
  -- Get subscription (active or trial first)
  SELECT * INTO v_sub FROM tenant_subscriptions 
    WHERE company_id = p_company_id AND status IN ('active','trial')
    ORDER BY created_at DESC LIMIT 1;

  v_sub_status := COALESCE(v_sub.status, 'no_subscription');

  -- Fallback: check for other statuses
  IF NOT FOUND THEN
    SELECT status INTO v_sub_status FROM tenant_subscriptions
      WHERE company_id = p_company_id ORDER BY created_at DESC LIMIT 1;
    v_sub_status := COALESCE(v_sub_status, 'no_subscription');
  END IF;

  -- Map subscription status to lock reason
  IF v_sub_status NOT IN ('active', 'trial') THEN
    -- Still get user roles for context
    IF p_user_id IS NOT NULL THEN
      SELECT array_agg(role::text) INTO v_user_roles FROM user_roles WHERE user_id = p_user_id;
      v_user_roles := COALESCE(v_user_roles, ARRAY[]::text[]);
      v_is_admin := v_user_roles && ARRAY['admin','tenant_admin','super_admin','hr_manager'];
    END IF;

    RETURN jsonb_build_object(
      'status', v_sub_status,
      'plan', null,
      'plan_id', null,
      'ai_package', null,
      'ai_package_id', null,
      'features', '{}'::jsonb,
      'limits', '{}'::jsonb,
      'usage', '{}'::jsonb,
      'roles', COALESCE(to_jsonb(v_user_roles), '[]'::jsonb),
      'is_admin', v_is_admin,
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
  v_plan_name := v_plan.name;
  v_plan_id := v_plan.id;

  -- Get AI package
  IF v_sub.ai_package_id IS NOT NULL THEN
    SELECT * INTO v_ai_pkg FROM ai_packages WHERE id = v_sub.ai_package_id AND is_active = true;
    v_ai_pkg_name := v_ai_pkg.name;
    v_ai_pkg_id := v_ai_pkg.id;
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

  v_usage := jsonb_build_object(
    'employees', v_usage_employees,
    'branches', v_usage_branches,
    'ai_requests', v_usage_ai
  );

  -- Build plan features
  FOR v_feat IN SELECT * FROM plan_features WHERE plan_id = v_sub.plan_id LOOP
    v_entry := jsonb_build_object(
      'enabled', v_feat.included,
      'source', 'plan',
      'reason', CASE WHEN NOT v_feat.included THEN 'not_in_plan' ELSE null END
    );
    v_features := v_features || jsonb_build_object(v_feat.feature_key, v_entry);
  END LOOP;

  -- Apply AI package features
  IF v_ai_pkg.id IS NOT NULL THEN
    FOR v_ai_feat IN SELECT * FROM ai_package_features WHERE package_id = v_ai_pkg.id LOOP
      v_entry := jsonb_build_object(
        'enabled', v_ai_feat.included,
        'source', 'ai_package',
        'reason', CASE WHEN NOT v_ai_feat.included THEN 'not_in_plan' ELSE null END
      );
      v_features := v_features || jsonb_build_object(v_ai_feat.feature_key, v_entry);
    END LOOP;
  END IF;

  -- Apply tenant overrides (highest priority)
  FOR v_override IN SELECT * FROM tenant_feature_overrides WHERE company_id = p_company_id LOOP
    v_entry := jsonb_build_object(
      'enabled', v_override.enabled,
      'source', CASE WHEN v_override.enabled THEN 'tenant_override' ELSE 'disabled_by_admin' END,
      'reason', CASE WHEN NOT v_override.enabled THEN 'disabled_by_admin' ELSE null END
    );
    v_features := v_features || jsonb_build_object(v_override.feature_key, v_entry);
  END LOOP;

  -- Apply user-level AI overrides if user_id provided
  IF p_user_id IS NOT NULL THEN
    DECLARE
      v_user_override RECORD;
    BEGIN
      SELECT * INTO v_user_override FROM user_ai_overrides WHERE user_id = p_user_id AND company_id = p_company_id;
      IF FOUND THEN
        IF v_user_override.ai_enabled = false THEN
          -- Disable all AI features for this user
          FOR v_ai_feat IN SELECT feature_key FROM ai_package_features WHERE package_id = v_ai_pkg.id LOOP
            v_features := v_features || jsonb_build_object(v_ai_feat.feature_key, 
              jsonb_build_object('enabled', false, 'source', 'user_override', 'reason', 'disabled_for_user'));
          END LOOP;
        ELSE
          -- Apply individual feature overrides
          IF v_user_override.ai_hr_assistant IS NOT NULL THEN
            v_features := v_features || jsonb_build_object('ai_hr_assistant', jsonb_build_object('enabled', v_user_override.ai_hr_assistant, 'source', 'user_override', 'reason', CASE WHEN NOT v_user_override.ai_hr_assistant THEN 'disabled_for_user' ELSE null END));
          END IF;
          IF v_user_override.ai_workforce_analytics IS NOT NULL THEN
            v_features := v_features || jsonb_build_object('ai_workforce_analytics', jsonb_build_object('enabled', v_user_override.ai_workforce_analytics, 'source', 'user_override', 'reason', CASE WHEN NOT v_user_override.ai_workforce_analytics THEN 'disabled_for_user' ELSE null END));
          END IF;
          IF v_user_override.ai_recruitment_intelligence IS NOT NULL THEN
            v_features := v_features || jsonb_build_object('ai_recruitment_intelligence', jsonb_build_object('enabled', v_user_override.ai_recruitment_intelligence, 'source', 'user_override', 'reason', CASE WHEN NOT v_user_override.ai_recruitment_intelligence THEN 'disabled_for_user' ELSE null END));
          END IF;
          IF v_user_override.ai_gap_analysis IS NOT NULL THEN
            v_features := v_features || jsonb_build_object('ai_gap_analysis', jsonb_build_object('enabled', v_user_override.ai_gap_analysis, 'source', 'user_override', 'reason', CASE WHEN NOT v_user_override.ai_gap_analysis THEN 'disabled_for_user' ELSE null END));
          END IF;
          IF v_user_override.ai_planning_advisor IS NOT NULL THEN
            v_features := v_features || jsonb_build_object('ai_planning_advisor', jsonb_build_object('enabled', v_user_override.ai_planning_advisor, 'source', 'user_override', 'reason', CASE WHEN NOT v_user_override.ai_planning_advisor THEN 'disabled_for_user' ELSE null END));
          END IF;
          IF v_user_override.ai_employee_career_coach IS NOT NULL THEN
            v_features := v_features || jsonb_build_object('ai_employee_career_coach', jsonb_build_object('enabled', v_user_override.ai_employee_career_coach, 'source', 'user_override', 'reason', CASE WHEN NOT v_user_override.ai_employee_career_coach THEN 'disabled_for_user' ELSE null END));
          END IF;
        END IF;
      END IF;
    END;
  END IF;

  -- Check quota-based features
  IF v_usage_employees > COALESCE(v_plan.max_employees, 99999) THEN
    v_entry := v_features->'hr_core';
    IF v_entry IS NOT NULL THEN
      v_features := v_features || jsonb_build_object('hr_core', v_entry || jsonb_build_object('quota_exceeded', true, 'quota_detail', 'employees'));
    END IF;
  END IF;

  IF v_usage_branches > COALESCE(v_plan.max_branches, 999) THEN
    v_entry := v_features->'multi_branch';
    IF v_entry IS NOT NULL THEN
      v_features := v_features || jsonb_build_object('multi_branch', v_entry || jsonb_build_object('quota_exceeded', true, 'quota_detail', 'branches'));
    END IF;
  END IF;

  IF v_usage_ai > COALESCE(v_plan.max_ai_requests, COALESCE(v_ai_pkg.monthly_request_limit, 99999)) THEN
    -- Mark all AI features as quota exceeded
    DECLARE
      v_key text;
    BEGIN
      FOR v_key IN SELECT jsonb_object_keys(v_features) LOOP
        IF v_key LIKE 'ai_%' THEN
          v_entry := v_features->v_key;
          v_features := v_features || jsonb_build_object(v_key, v_entry || jsonb_build_object('quota_exceeded', true, 'quota_detail', 'ai_requests'));
        END IF;
      END LOOP;
    END;
  END IF;

  RETURN jsonb_build_object(
    'status', v_sub_status,
    'plan', v_plan_name,
    'plan_id', v_plan_id,
    'ai_package', v_ai_pkg_name,
    'ai_package_id', v_ai_pkg_id,
    'features', v_features,
    'limits', v_limits,
    'usage', v_usage,
    'roles', COALESCE(to_jsonb(v_user_roles), '[]'::jsonb),
    'is_admin', v_is_admin
  );
END;
$$;