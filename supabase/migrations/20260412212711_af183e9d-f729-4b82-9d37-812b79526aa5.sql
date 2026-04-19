
-- 1) Add global enable flag to modules
ALTER TABLE public.madad_modules ADD COLUMN IF NOT EXISTS is_global_enabled boolean NOT NULL DEFAULT true;

-- 2) Add trial config to packages
ALTER TABLE public.madad_packages ADD COLUMN IF NOT EXISTS trial_duration_days integer NOT NULL DEFAULT 14;
ALTER TABLE public.madad_packages ADD COLUMN IF NOT EXISTS trial_modules jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.madad_packages ADD COLUMN IF NOT EXISTS trial_features jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.madad_packages ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 3) Add trial tracking to subscriptions
ALTER TABLE public.madad_tenant_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.madad_tenant_subscriptions ADD COLUMN IF NOT EXISTS custom_price numeric DEFAULT 0;

-- 4) Platform-level settings table
CREATE TABLE IF NOT EXISTS public.madad_platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.madad_platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform settings"
  ON public.madad_platform_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only super admins can modify platform settings"
  ON public.madad_platform_settings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 5) Seed default platform settings
INSERT INTO public.madad_platform_settings (key, value, description) VALUES
  ('default_trial_days', '14', 'Default trial duration in days for new tenants'),
  ('auto_trial_on_register', 'true', 'Automatically start trial when a new tenant registers'),
  ('platform_maintenance', 'false', 'Enable platform-wide maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- 6) Module feature catalog per module (links features to modules)
ALTER TABLE public.feature_catalog ADD COLUMN IF NOT EXISTS module_key text DEFAULT 'tamkeen';
ALTER TABLE public.feature_catalog ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.feature_catalog ADD COLUMN IF NOT EXISTS yearly_price numeric NOT NULL DEFAULT 0;
