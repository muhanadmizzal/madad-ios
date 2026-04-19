
-- Add pricing_status to feature_catalog
ALTER TABLE public.feature_catalog
  ADD COLUMN IF NOT EXISTS pricing_status text NOT NULL DEFAULT 'priced'
  CONSTRAINT chk_pricing_status CHECK (pricing_status IN ('priced', 'free', 'hidden'));

-- Back-fill: features with zero price → free, others → priced
UPDATE public.feature_catalog
SET pricing_status = CASE
  WHEN monthly_price = 0 AND per_user_price = 0 THEN 'free'
  ELSE 'priced'
END;
