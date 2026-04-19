CREATE OR REPLACE FUNCTION public.get_feature_access(p_company_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_ai_pkg public.ai_packages%ROWTYPE;
  v_features jsonb := '{}'::jsonb;
  v_feat RECORD;
  v_override RECORD;
  v_ai_feat RECORD;
  v_addon RECORD;
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
  v_platform_feat RECORD;
  v_ai_request_limit int := 0;
BEGIN
  SELECT * INTO v_sub FROM tenant_subscriptions
    WHERE company_id = p_company_id AND status IN ('active','trial')
    ORDER BY created_at DESC LIMIT 1;

  v_sub_status := COALESCE(v_sub.status, 'no_subscription');

  IF NOT FOUND THEN
    SELECT status INTO v_sub_status FROM tenant_subscriptions
      WHERE company_id = p_company_id ORDER BY created_at DESC LIMIT 1;
    v_sub_status := COALESCE(v_sub_status, 'no_subscription');
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT array_agg(role::text) INTO v_user_roles FROM user_roles WHERE user_id = p_user_id;
    v_user_roles := COALESCE(v_user_roles, ARRAY[]::text[]);
    v_is_admin := v_user_roles && ARRAY['admin','tenant_admin','super_admin','hr_manager'];
  END IF;

  IF v_sub_status NOT IN ('active', 'trial') THEN
    RETURN jsonb_build_object(
      'status', v_sub_status,
      'plan', null, 'plan_id', null,
      'ai_package', null, 'ai_package_id', null,
      'features', '{}'::jsonb, 'limits', '{}'::jsonb, 'usage', '{}'::jsonb,
      'roles', COALESCE(to_jsonb(v_user_roles), '[]'::jsonb),
      'is_admin', v_is_admin,
      'message', CASE v_sub_status
        WHEN 'suspended' THEN 'subscription_suspended'
        WHEN 'cancelled' THEN 'subscription_cancelled'
        WHEN 'overdue' THEN 'subscription_overdue'
        WHEN 'pending' THEN 'subscription_pending'
        ELSE 'no_subscription' END
    );
  END IF;

  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_sub.plan_id;
  v_plan_name := v_plan.name;
  v_plan_id := v_plan.id;

  IF v_sub.ai_package_id IS NOT NULL THEN
    SELECT * INTO v_ai_pkg FROM ai_packages WHERE id = v_sub.ai_package_id AND is_active = true;
    v_ai_pkg_name := v_ai_pkg.name;
    v_ai_pkg_id := v_ai_pkg.id;
  END IF;

  v_ai_request_limit := COALESCE(v_plan.max_ai_requests, v_ai_pkg.monthly_request_limit, 0);

  v_limits := jsonb_build_object(
    'employees', COALESCE(v_plan.max_employees, 0),
    'branches', COALESCE(v_plan.max_branches, 0),
    'storage_gb', COALESCE(v_plan.max_storage_gb, 0),
    'ai_requests', v_ai_request_limit
  );

  SELECT count(*) INTO v_usage_employees FROM employees WHERE company_id = p_company_id AND status = 'active';
  SELECT count(*) INTO v_usage_branches FROM branches WHERE company_id = p_company_id;
  SELECT COALESCE(SUM(amount), 0)::int INTO v_usage_ai FROM usage_tracking
    WHERE company_id = p_company_id AND usage_type = 'ai_requests' AND period = to_char(CURRENT_DATE, 'YYYY-MM');

  v_usage := jsonb_build_object(
    'employees', v_usage_employees,
    'branches', v_usage_branches,
    'ai_requests', v_usage_ai
  );

  FOR v_feat IN SELECT * FROM plan_features WHERE plan_id = v_sub.plan_id LOOP
    v_entry := jsonb_build_object(
      'enabled', v_feat.included,
      'source', 'plan',
      'reason', CASE WHEN NOT v_feat.included THEN 'not_in_plan' ELSE null END
    );
    v_features := v_features || jsonb_build_object(v_feat.feature_key, v_entry);
  END LOOP;

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

  FOR v_addon IN SELECT * FROM tenant_addons WHERE company_id = p_company_id AND status = 'active' LOOP
    v_features := v_features || jsonb_build_object(v_addon.addon_key,
      jsonb_build_object('enabled', true, 'source', 'addon', 'reason', null));
  END LOOP;

  FOR v_override IN SELECT * FROM tenant_feature_overrides WHERE company_id = p_company_id LOOP
    v_entry := jsonb_build_object(
      'enabled', v_override.enabled,
      'source', CASE WHEN v_override.enabled THEN 'tenant_override' ELSE 'disabled_by_admin' END,
      'reason', CASE WHEN NOT v_override.enabled THEN 'disabled_by_admin' ELSE null END
    );
    v_features := v_features || jsonb_build_object(v_override.feature_key, v_entry);
  END LOOP;

  IF p_user_id IS NOT NULL THEN
    DECLARE
      v_user_override RECORD;
      v_key text;
    BEGIN
      SELECT * INTO v_user_override FROM user_ai_overrides WHERE user_id = p_user_id AND company_id = p_company_id;
      IF FOUND THEN
        IF v_user_override.ai_enabled = false THEN
          FOR v_key IN SELECT jsonb_object_keys(v_features) LOOP
            IF v_key LIKE 'ai_%' THEN
              v_features := v_features || jsonb_build_object(v_key,
                jsonb_build_object('enabled', false, 'source', 'user_override', 'reason', 'disabled_for_user'));
            END IF;
          END LOOP;
        ELSE
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

  FOR v_platform_feat IN SELECT feature_key FROM platform_features WHERE enabled = false LOOP
    v_features := v_features || jsonb_build_object(v_platform_feat.feature_key,
      jsonb_build_object('enabled', false, 'source', 'platform', 'reason', 'platform_disabled'));
  END LOOP;

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

  IF v_usage_ai > COALESCE(NULLIF(v_ai_request_limit, 0), 99999) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_entitlements(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_ai_pkg public.ai_packages%ROWTYPE;
  v_features jsonb := '{}'::jsonb;
  v_limits jsonb;
  v_addons jsonb := '[]'::jsonb;
  v_feat RECORD;
  v_override RECORD;
  v_ai_request_limit int := 0;
BEGIN
  SELECT * INTO v_sub FROM public.tenant_subscriptions
    WHERE company_id = p_company_id AND status = 'active'
    ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('plan', null, 'ai_package', null, 'features', '{}'::jsonb, 'limits', '{}'::jsonb, 'addons', '[]'::jsonb, 'status', 'no_subscription');
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_sub.plan_id;

  IF v_sub.ai_package_id IS NOT NULL THEN
    SELECT * INTO v_ai_pkg FROM public.ai_packages WHERE id = v_sub.ai_package_id AND is_active = true;
  END IF;

  v_ai_request_limit := COALESCE(v_plan.max_ai_requests, v_ai_pkg.monthly_request_limit, 0);

  v_limits := jsonb_build_object(
    'employees', COALESCE(v_plan.max_employees, 0),
    'branches', COALESCE(v_plan.max_branches, 0),
    'storage_gb', COALESCE(v_plan.max_storage_gb, 0),
    'ai_requests', v_ai_request_limit
  );

  FOR v_feat IN SELECT * FROM public.plan_features WHERE plan_id = v_sub.plan_id LOOP
    v_features := v_features || jsonb_build_object(v_feat.feature_key, v_feat.included);
  END LOOP;

  FOR v_override IN SELECT * FROM public.tenant_feature_overrides WHERE company_id = p_company_id LOOP
    v_features := v_features || jsonb_build_object(v_override.feature_key, v_override.enabled);
    IF v_override.limit_override IS NOT NULL THEN
      v_limits := v_limits || jsonb_build_object(v_override.feature_key || '_limit', v_override.limit_override);
    END IF;
  END LOOP;

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
$function$;

CREATE OR REPLACE FUNCTION public.approve_subscription_change(p_request_id uuid, p_action text DEFAULT 'approved'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_req RECORD;
  v_old_sub RECORD;
  v_new_sub RECORD;
  v_target_plan_id uuid;
  v_target_ai_pkg_id uuid;
  v_target_cycle text;
  v_target_end_date date;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT (has_role(v_actor, 'super_admin') OR has_role(v_actor, 'business_admin')) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT * INTO v_req FROM subscription_change_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Request already processed'; END IF;

  UPDATE subscription_change_requests SET
    status = p_action,
    reviewed_by = v_actor,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  IF p_action = 'approved' THEN
    SELECT * INTO v_old_sub FROM tenant_subscriptions
      WHERE company_id = v_req.company_id AND status IN ('active', 'trial')
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1;

    v_target_plan_id := COALESCE(v_req.requested_plan_id, v_old_sub.plan_id, v_req.current_plan_id);
    IF v_target_plan_id IS NULL THEN
      RAISE EXCEPTION 'Cannot approve request without target plan';
    END IF;

    v_target_ai_pkg_id := COALESCE(v_req.requested_ai_package_id, v_old_sub.ai_package_id, v_req.current_ai_package_id);
    v_target_cycle := COALESCE(v_req.billing_cycle, v_old_sub.billing_cycle, 'monthly');
    v_target_end_date := CASE
      WHEN v_target_cycle = 'yearly' THEN (CURRENT_DATE + INTERVAL '1 year')::date
      ELSE (CURRENT_DATE + INTERVAL '1 month')::date
    END;

    IF v_old_sub.id IS NULL THEN
      INSERT INTO tenant_subscriptions (
        company_id, plan_id, ai_package_id, status, billing_cycle, start_date, end_date, auto_renew, created_by, notes
      ) VALUES (
        v_req.company_id, v_target_plan_id, v_target_ai_pkg_id, 'active', v_target_cycle, CURRENT_DATE, v_target_end_date, true, v_actor,
        'Created from approved subscription_change_request ' || p_request_id::text
      ) RETURNING * INTO v_new_sub;
    ELSE
      UPDATE tenant_subscriptions
      SET status = 'cancelled', updated_at = now()
      WHERE company_id = v_req.company_id
        AND status IN ('active', 'trial')
        AND id <> v_old_sub.id;

      UPDATE tenant_subscriptions
      SET
        plan_id = v_target_plan_id,
        ai_package_id = v_target_ai_pkg_id,
        billing_cycle = v_target_cycle,
        status = 'active',
        start_date = COALESCE(start_date, CURRENT_DATE),
        end_date = COALESCE(end_date, v_target_end_date),
        updated_at = now()
      WHERE id = v_old_sub.id
      RETURNING * INTO v_new_sub;
    END IF;

    INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id, before_state, after_state)
    VALUES (
      v_actor,
      'subscription_change_approved',
      'subscription_change_request',
      p_request_id::text,
      v_req.company_id,
      CASE WHEN v_old_sub.id IS NULL THEN NULL ELSE jsonb_build_object(
        'plan_id', v_old_sub.plan_id,
        'ai_package_id', v_old_sub.ai_package_id,
        'billing_cycle', v_old_sub.billing_cycle,
        'status', v_old_sub.status
      ) END,
      jsonb_build_object(
        'subscription_id', v_new_sub.id,
        'plan_id', v_new_sub.plan_id,
        'ai_package_id', v_new_sub.ai_package_id,
        'billing_cycle', v_new_sub.billing_cycle,
        'status', v_new_sub.status
      )
    );
  ELSE
    INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id)
    VALUES (v_actor, 'subscription_change_rejected', 'subscription_change_request', p_request_id::text, v_req.company_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action, 'company_id', v_req.company_id);
END;
$function$;