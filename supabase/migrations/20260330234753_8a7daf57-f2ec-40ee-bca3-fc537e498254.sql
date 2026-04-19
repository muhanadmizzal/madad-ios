INSERT INTO public.feature_catalog (key, name, name_ar, description, category, pricing_type, monthly_price, per_user_price, is_active, sort_order)
VALUES (
  'recruitment_agency',
  'Recruitment Agency Mode',
  'وكالة التوظيف',
  'Enable external hiring agency mode for managing third-party recruitment clients',
  'addon',
  'flat',
  0,
  0,
  true,
  150
)
ON CONFLICT (key) DO NOTHING;