
-- =============================================
-- MADAD PLATFORM CORE TABLES
-- =============================================

-- 1. Module Catalog
CREATE TABLE public.madad_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon TEXT DEFAULT 'Package',
  color TEXT DEFAULT 'bg-primary',
  status TEXT NOT NULL DEFAULT 'active', -- active, coming_soon, deprecated
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.madad_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modules" ON public.madad_modules
  FOR SELECT USING (true);

CREATE POLICY "Platform admins manage modules" ON public.madad_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. Packages
CREATE TABLE public.madad_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  yearly_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IQD',
  badge_ar TEXT,
  badge_en TEXT,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.madad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages" ON public.madad_packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Platform admins manage packages" ON public.madad_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3. Package ↔ Module mapping
CREATE TABLE public.madad_package_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.madad_packages(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.madad_modules(id) ON DELETE CASCADE,
  UNIQUE(package_id, module_id)
);

ALTER TABLE public.madad_package_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view package modules" ON public.madad_package_modules
  FOR SELECT USING (true);

CREATE POLICY "Platform admins manage package modules" ON public.madad_package_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 4. Package Features (limits)
CREATE TABLE public.madad_package_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.madad_packages(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_label_ar TEXT NOT NULL,
  feature_label_en TEXT NOT NULL,
  value TEXT NOT NULL, -- e.g. "50", "unlimited", "true", "false"
  sort_order INT DEFAULT 0,
  UNIQUE(package_id, feature_key)
);

ALTER TABLE public.madad_package_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view package features" ON public.madad_package_features
  FOR SELECT USING (true);

CREATE POLICY "Platform admins manage package features" ON public.madad_package_features
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 5. Tenant Subscriptions
CREATE TABLE public.madad_tenant_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.madad_packages(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, cancelled, trial
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  trial_ends_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.madad_tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tenant subscription" ON public.madad_tenant_subscriptions
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Platform admins manage all subscriptions" ON public.madad_tenant_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 6. Tenant Modules (activated modules per tenant)
CREATE TABLE public.madad_tenant_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.madad_modules(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, module_id)
);

ALTER TABLE public.madad_tenant_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tenant modules" ON public.madad_tenant_modules
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Platform admins manage tenant modules" ON public.madad_tenant_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 7. Offers
CREATE TABLE public.madad_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed, bundle
  discount_value NUMERIC DEFAULT 0,
  applicable_package_id UUID REFERENCES public.madad_packages(id),
  applicable_module_ids UUID[] DEFAULT '{}',
  badge_ar TEXT,
  badge_en TEXT,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.madad_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offers" ON public.madad_offers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Platform admins manage offers" ON public.madad_offers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- SEED DATA
-- =============================================

-- Modules
INSERT INTO public.madad_modules (key, name_ar, name_en, description_ar, description_en, icon, color, status, sort_order) VALUES
  ('tamkeen', 'تمكين', 'Tamkeen', 'إدارة الموارد البشرية والقوى العاملة', 'HR & Workforce Management', 'Users', 'bg-primary', 'active', 1),
  ('tathbeet', 'تثبيت', 'Tathbeet', 'إدارة الحجوزات والخدمات', 'Bookings & Service Management', 'CalendarCheck', 'bg-secondary', 'active', 2),
  ('takzeen', 'تخزين', 'Takzeen', 'إدارة المخزون والمستودعات', 'Inventory & Warehouse Management', 'Package', 'bg-info', 'coming_soon', 3),
  ('tahseel', 'تحصيل', 'Tahseel', 'الإدارة المالية والمحاسبية', 'Finance & Accounting', 'Coins', 'bg-accent', 'coming_soon', 4);

-- Packages
INSERT INTO public.madad_packages (key, name_ar, name_en, description_ar, description_en, monthly_price, yearly_price, badge_ar, badge_en, is_popular, sort_order) VALUES
  ('basic', 'أساسي', 'Basic', 'للشركات الصغيرة والناشئة', 'For small businesses and startups', 150000, 1500000, NULL, NULL, false, 1),
  ('pro', 'احترافي', 'Pro', 'للشركات المتوسطة والمتنامية', 'For growing medium businesses', 350000, 3500000, 'الأكثر شيوعاً', 'Most Popular', true, 2),
  ('enterprise', 'مؤسسي', 'Enterprise', 'للمؤسسات الكبيرة', 'For large enterprises', 750000, 7500000, NULL, NULL, false, 3);

-- Package ↔ Module mappings
INSERT INTO public.madad_package_modules (package_id, module_id)
SELECT p.id, m.id FROM public.madad_packages p, public.madad_modules m
WHERE p.key = 'basic' AND m.key = 'tamkeen';

INSERT INTO public.madad_package_modules (package_id, module_id)
SELECT p.id, m.id FROM public.madad_packages p, public.madad_modules m
WHERE p.key = 'pro' AND m.key IN ('tamkeen', 'tathbeet');

INSERT INTO public.madad_package_modules (package_id, module_id)
SELECT p.id, m.id FROM public.madad_packages p, public.madad_modules m
WHERE p.key = 'enterprise' AND m.key IN ('tamkeen', 'tathbeet', 'takzeen', 'tahseel');

-- Package Features
INSERT INTO public.madad_package_features (package_id, feature_key, feature_label_ar, feature_label_en, value, sort_order)
SELECT p.id, f.feature_key, f.feature_label_ar, f.feature_label_en, f.value, f.sort_order
FROM public.madad_packages p
CROSS JOIN (VALUES
  ('max_employees', 'الحد الأقصى للموظفين', 'Max Employees', '25', 1),
  ('max_bookings', 'الحد الأقصى للحجوزات', 'Max Bookings', '0', 2),
  ('whatsapp_notifications', 'إشعارات واتساب', 'WhatsApp Notifications', 'false', 3),
  ('analytics', 'التحليلات', 'Analytics', 'basic', 4),
  ('custom_branding', 'العلامة التجارية', 'Custom Branding', 'false', 5),
  ('api_access', 'الوصول للـ API', 'API Access', 'false', 6),
  ('priority_support', 'دعم مميز', 'Priority Support', 'false', 7)
) AS f(feature_key, feature_label_ar, feature_label_en, value, sort_order)
WHERE p.key = 'basic';

INSERT INTO public.madad_package_features (package_id, feature_key, feature_label_ar, feature_label_en, value, sort_order)
SELECT p.id, f.feature_key, f.feature_label_ar, f.feature_label_en, f.value, f.sort_order
FROM public.madad_packages p
CROSS JOIN (VALUES
  ('max_employees', 'الحد الأقصى للموظفين', 'Max Employees', '100', 1),
  ('max_bookings', 'الحد الأقصى للحجوزات', 'Max Bookings', '500', 2),
  ('whatsapp_notifications', 'إشعارات واتساب', 'WhatsApp Notifications', 'true', 3),
  ('analytics', 'التحليلات', 'Analytics', 'advanced', 4),
  ('custom_branding', 'العلامة التجارية', 'Custom Branding', 'true', 5),
  ('api_access', 'الوصول للـ API', 'API Access', 'false', 6),
  ('priority_support', 'دعم مميز', 'Priority Support', 'true', 7)
) AS f(feature_key, feature_label_ar, feature_label_en, value, sort_order)
WHERE p.key = 'pro';

INSERT INTO public.madad_package_features (package_id, feature_key, feature_label_ar, feature_label_en, value, sort_order)
SELECT p.id, f.feature_key, f.feature_label_ar, f.feature_label_en, f.value, f.sort_order
FROM public.madad_packages p
CROSS JOIN (VALUES
  ('max_employees', 'الحد الأقصى للموظفين', 'Max Employees', 'unlimited', 1),
  ('max_bookings', 'الحد الأقصى للحجوزات', 'Max Bookings', 'unlimited', 2),
  ('whatsapp_notifications', 'إشعارات واتساب', 'WhatsApp Notifications', 'true', 3),
  ('analytics', 'التحليلات', 'Analytics', 'premium', 4),
  ('custom_branding', 'العلامة التجارية', 'Custom Branding', 'true', 5),
  ('api_access', 'الوصول للـ API', 'API Access', 'true', 6),
  ('priority_support', 'دعم مميز', 'Priority Support', 'true', 7)
) AS f(feature_key, feature_label_ar, feature_label_en, value, sort_order)
WHERE p.key = 'enterprise';

-- Sample offers
INSERT INTO public.madad_offers (title_ar, title_en, description_ar, description_en, discount_type, discount_value, badge_ar, badge_en, is_active) VALUES
  ('عرض الإطلاق', 'Launch Offer', 'خصم 30% على الاشتراك السنوي لأول 100 عميل', '30% off yearly subscription for first 100 customers', 'percentage', 30, 'محدود', 'Limited', true),
  ('باقة تمكين + تثبيت', 'Tamkeen + Tathbeet Bundle', 'اشترك في تمكين وتثبيت معاً واحصل على خصم 20%', 'Subscribe to Tamkeen & Tathbeet together and get 20% off', 'percentage', 20, 'حزمة', 'Bundle', true),
  ('أول 3 أشهر مجاناً', 'First 3 Months Free', 'ابدأ تجربتك مع أي باقة واحصل على أول 3 أشهر مجاناً', 'Start with any plan and get your first 3 months free', 'fixed', 0, 'جديد', 'New', true);
