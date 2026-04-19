
-- Junction table: package ↔ feature catalog (cross-module bundling)
CREATE TABLE public.package_catalog_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.madad_packages(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.feature_catalog(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  module_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, feature_id)
);

ALTER TABLE public.package_catalog_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read package_catalog_features"
  ON public.package_catalog_features FOR SELECT
  USING (true);

CREATE POLICY "Authenticated manage package_catalog_features"
  ON public.package_catalog_features FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Extend madad_offers with offer engine columns
ALTER TABLE public.madad_offers
  ADD COLUMN IF NOT EXISTS offer_type TEXT NOT NULL DEFAULT 'discount',
  ADD COLUMN IF NOT EXISTS apply_to_packages UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS condition_type TEXT,
  ADD COLUMN IF NOT EXISTS condition_value TEXT,
  ADD COLUMN IF NOT EXISTS bonus_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_feature_keys TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_billing_cycle TEXT;

-- Index for fast lookup
CREATE INDEX idx_pcf_package ON public.package_catalog_features(package_id);
CREATE INDEX idx_pcf_module ON public.package_catalog_features(module_key);
