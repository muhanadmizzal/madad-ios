
-- Add columns to tenant_features for unified tracking
ALTER TABLE public.tenant_features
ADD COLUMN IF NOT EXISTS module_key text,
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS requested_by uuid,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

-- Add columns to feature_change_requests for richer tracking
ALTER TABLE public.feature_change_requests
ADD COLUMN IF NOT EXISTS module_key text,
ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'enable',
ADD COLUMN IF NOT EXISTS pricing_impact numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_feature_status text DEFAULT 'inactive';

-- Create workflow settings table for controlling approval behavior
CREATE TABLE IF NOT EXISTS public.madad_workflow_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.madad_workflow_settings ENABLE ROW LEVEL SECURITY;

-- Insert default workflow settings
INSERT INTO public.madad_workflow_settings (setting_key, setting_value, description)
VALUES
  ('require_owner_approval', true, 'Tenant feature changes require business owner approval'),
  ('require_admin_approval', false, 'Owner-approved changes require super admin approval'),
  ('allow_self_service_activation', true, 'Tenants can self-request module activation'),
  ('manual_payment_requires_confirmation', true, 'Manual payments require admin confirmation before activation')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS for madad_workflow_settings (read for all authenticated, write for admins handled in app)
CREATE POLICY "Authenticated users can view workflow settings"
ON public.madad_workflow_settings FOR SELECT
TO authenticated
USING (true);

-- Backfill module_key in tenant_features from feature_catalog
UPDATE public.tenant_features tf
SET module_key = fc.module_key
FROM public.feature_catalog fc
WHERE tf.feature_key = fc.key
AND tf.module_key IS NULL;

-- Backfill module_key in feature_change_requests from feature_catalog
UPDATE public.feature_change_requests fcr
SET module_key = fc.module_key
FROM public.feature_catalog fc
WHERE fcr.feature_key = fc.key
AND fcr.module_key IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_features_company_status ON public.tenant_features(company_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_features_module ON public.tenant_features(company_id, module_key);
CREATE INDEX IF NOT EXISTS idx_fcr_company_status ON public.feature_change_requests(company_id, status);
