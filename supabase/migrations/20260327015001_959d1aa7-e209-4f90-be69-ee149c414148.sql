
-- Add pricing columns to feature_catalog
ALTER TABLE public.feature_catalog
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_user_price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'zap',
  ADD COLUMN IF NOT EXISTS includes_limits JSONB DEFAULT '{}';

-- Create tenant_features table
CREATE TABLE IF NOT EXISTS public.tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  custom_price NUMERIC,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_key)
);

ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view own features" ON public.tenant_features
FOR SELECT TO authenticated
USING (company_id = get_my_company_id());

CREATE POLICY "Admins can manage tenant features" ON public.tenant_features
FOR ALL TO authenticated
USING (
  (company_id = get_my_company_id() AND (
    has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  ))
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'business_admin'::app_role)
)
WITH CHECK (
  (company_id = get_my_company_id() AND (
    has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  ))
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'business_admin'::app_role)
);

-- Set pricing for existing catalog items
UPDATE public.feature_catalog SET pricing_type = 'per_user', per_user_price = 2, sort_order = 10, icon = 'users' WHERE key = 'employee_profiles';
UPDATE public.feature_catalog SET pricing_type = 'per_user', per_user_price = 2, sort_order = 11, icon = 'users' WHERE key = 'employee_management';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 0, sort_order = 5, icon = 'shield' WHERE key = 'hr_core';
UPDATE public.feature_catalog SET pricing_type = 'per_user', per_user_price = 3, sort_order = 20, icon = 'clock' WHERE key = 'attendance';
UPDATE public.feature_catalog SET pricing_type = 'per_user', per_user_price = 2, sort_order = 25, icon = 'calendar-days' WHERE key = 'leave_management';
UPDATE public.feature_catalog SET pricing_type = 'per_user', per_user_price = 5, sort_order = 30, icon = 'wallet' WHERE key = 'payroll';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 25, sort_order = 40, icon = 'briefcase' WHERE key = 'recruitment';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 10, sort_order = 45, icon = 'clipboard-check' WHERE key = 'onboarding';
UPDATE public.feature_catalog SET pricing_type = 'per_user', per_user_price = 2, sort_order = 50, icon = 'target' WHERE key = 'performance';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 15, sort_order = 55, icon = 'graduation-cap' WHERE key = 'learning';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 15, sort_order = 56, icon = 'graduation-cap' WHERE key = 'training';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 10, sort_order = 60, icon = 'file-text', includes_limits = '{"storage_gb": 5}' WHERE key = 'documents';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 10, sort_order = 65, icon = 'git-branch' WHERE key = 'org_chart';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 15, sort_order = 70, icon = 'map-pin', includes_limits = '{"max_branches": 5}' WHERE key = 'multi_branch';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 10, sort_order = 75, icon = 'bar-chart-3' WHERE key = 'reports';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 8, sort_order = 80, icon = 'check-square' WHERE key = 'approvals';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 8, sort_order = 81, icon = 'check-square' WHERE key = 'workflows';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 20, sort_order = 85, icon = 'zap' WHERE key = 'advanced_analytics';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 30, sort_order = 90, icon = 'bot' WHERE key = 'api_access';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 12, sort_order = 91, icon = 'file-text' WHERE key = 'custom_documents';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 10, sort_order = 92, icon = 'receipt' WHERE key = 'payroll_workflow';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 8, sort_order = 93, icon = 'wallet' WHERE key = 'salary_workflow';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 15, sort_order = 94, icon = 'folder-kanban' WHERE key = 'projects';
-- AI features
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 15, sort_order = 200, icon = 'sparkles', includes_limits = '{"ai_requests": 100}' WHERE key = 'ai_hr_assistant';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 20, sort_order = 210, icon = 'brain', includes_limits = '{"ai_requests": 200}' WHERE key = 'ai_workforce_analytics';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 25, sort_order = 220, icon = 'briefcase', includes_limits = '{"ai_requests": 150}' WHERE key = 'ai_recruitment_intelligence';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 15, sort_order = 230, icon = 'search', includes_limits = '{"ai_requests": 100}' WHERE key = 'ai_gap_analysis';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 20, sort_order = 240, icon = 'lightbulb', includes_limits = '{"ai_requests": 100}' WHERE key = 'ai_planning_advisor';
UPDATE public.feature_catalog SET pricing_type = 'flat', monthly_price = 10, sort_order = 250, icon = 'graduation-cap', includes_limits = '{"ai_requests": 50}' WHERE key = 'ai_employee_career_coach';

-- RPC: Calculate basket bill for a tenant
CREATE OR REPLACE FUNCTION public.calculate_basket_bill(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items JSONB := '[]'::jsonb;
  v_total NUMERIC := 0;
  v_emp_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO v_emp_count
  FROM employees WHERE company_id = p_company_id AND status = 'active';

  FOR rec IN
    SELECT
      tf.feature_key,
      fc.name_ar,
      fc.category,
      fc.pricing_type,
      fc.monthly_price,
      fc.per_user_price,
      COALESCE(tf.custom_price, CASE
        WHEN fc.pricing_type = 'per_user' THEN fc.per_user_price * v_emp_count
        ELSE fc.monthly_price
      END) AS line_total
    FROM tenant_features tf
    JOIN feature_catalog fc ON fc.key = tf.feature_key
    WHERE tf.company_id = p_company_id
      AND tf.status = 'active'
      AND fc.is_active = true
    ORDER BY fc.sort_order
  LOOP
    v_items := v_items || jsonb_build_object(
      'feature_key', rec.feature_key,
      'description', rec.name_ar,
      'category', rec.category,
      'pricing_type', rec.pricing_type,
      'unit_price', CASE WHEN rec.pricing_type = 'per_user' THEN rec.per_user_price ELSE rec.monthly_price END,
      'quantity', CASE WHEN rec.pricing_type = 'per_user' THEN v_emp_count ELSE 1 END,
      'amount', rec.line_total
    );
    v_total := v_total + rec.line_total;
  END LOOP;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'employee_count', v_emp_count,
    'currency', 'USD',
    'status', CASE WHEN jsonb_array_length(v_items) > 0 THEN 'active' ELSE 'no_subscription' END
  );
END;
$$;

-- Helper: check if a tenant has a feature in their basket
CREATE OR REPLACE FUNCTION public.check_basket_feature(p_company_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_features tf
    JOIN public.feature_catalog fc ON fc.key = tf.feature_key
    WHERE tf.company_id = p_company_id
      AND tf.feature_key = p_feature_key
      AND tf.status = 'active'
      AND fc.is_active = true
  );
$$;
