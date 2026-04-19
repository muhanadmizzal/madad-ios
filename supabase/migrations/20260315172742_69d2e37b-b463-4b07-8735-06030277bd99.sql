
-- Platform settings: key-value store for business portal config
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT NOT NULL DEFAULT 'text', -- text, number, boolean, json
  category TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL,
  label_ar TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform feature flags
CREATE TABLE public.platform_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  icon TEXT,
  plans TEXT[] NOT NULL DEFAULT '{}',
  is_beta BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_features ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read/write
CREATE POLICY "Platform admins can manage settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Platform admins can manage features"
  ON public.platform_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default settings
INSERT INTO public.platform_settings (setting_key, setting_value, setting_type, category, label, label_ar) VALUES
  ('platform_name', 'Tamkeen HR', 'text', 'identity', 'Platform Name', 'اسم المنصة'),
  ('support_email', 'support@tamkeenhr.com', 'text', 'identity', 'Support Email', 'بريد الدعم'),
  ('default_language', 'Arabic (RTL)', 'text', 'identity', 'Default Language', 'اللغة الافتراضية'),
  ('smtp_host', '', 'text', 'email', 'SMTP Host', 'خادم SMTP'),
  ('smtp_port', '587', 'number', 'email', 'SMTP Port', 'منفذ SMTP'),
  ('sender_name', 'Tamkeen HR', 'text', 'email', 'Sender Name', 'اسم المرسل'),
  ('force_2fa_admins', 'false', 'boolean', 'security', 'Force 2FA for admins', 'فرض المصادقة الثنائية للمدراء'),
  ('audit_log_retention', 'true', 'boolean', 'security', 'Audit log retention (90 days)', 'حفظ سجل المراجعة (90 يوم)'),
  ('ip_whitelisting', 'false', 'boolean', 'security', 'IP whitelisting', 'قائمة IP المسموح بها'),
  ('auto_delete_expired_docs', 'false', 'boolean', 'storage', 'Auto-delete expired documents', 'حذف المستندات المنتهية تلقائياً'),
  ('compress_uploads', 'true', 'boolean', 'storage', 'Compress uploaded files', 'ضغط الملفات المرفوعة'),
  ('max_file_size_mb', 'true', 'boolean', 'storage', 'Max file size: 25 MB', 'الحد الأقصى: 25 ميجابايت'),
  ('invoice_reminders', 'true', 'boolean', 'notifications', 'Invoice overdue reminders', 'تذكيرات الفواتير المتأخرة'),
  ('subscription_expiry_alerts', 'true', 'boolean', 'notifications', 'Subscription expiry alerts', 'تنبيهات انتهاء الاشتراك'),
  ('new_tenant_email', 'true', 'boolean', 'notifications', 'New tenant onboarding email', 'بريد تهيئة المستأجر الجديد'),
  ('weekly_digest', 'false', 'boolean', 'notifications', 'Weekly platform digest', 'الملخص الأسبوعي للمنصة');

-- Seed default features  
INSERT INTO public.platform_features (feature_key, name, name_ar, plans, is_beta, enabled, sort_order) VALUES
  ('hr_core', 'HR Core', 'الموارد البشرية', '{Free,Starter,Pro,Enterprise}', false, true, 1),
  ('attendance', 'Attendance', 'الحضور والانصراف', '{Starter,Pro,Enterprise}', false, true, 2),
  ('payroll', 'Payroll', 'الرواتب', '{Pro,Enterprise}', false, true, 3),
  ('recruitment', 'Recruitment', 'التوظيف', '{Pro,Enterprise}', false, true, 4),
  ('performance', 'Performance', 'الأداء', '{Pro,Enterprise}', false, true, 5),
  ('training', 'Training / LMS', 'التدريب', '{Enterprise}', false, true, 6),
  ('documents', 'Documents & Signatures', 'المستندات والتوقيعات', '{Starter,Pro,Enterprise}', false, true, 7),
  ('ai_assistant', 'AI Assistant', 'المساعد الذكي', '{Pro,Enterprise}', true, true, 8),
  ('api_access', 'API Access', 'وصول API', '{Enterprise}', false, false, 9),
  ('sso', 'Single Sign-On (SSO)', 'تسجيل دخول موحد', '{Enterprise}', true, false, 10),
  ('advanced_analytics', 'Advanced Analytics', 'تحليلات متقدمة', '{Enterprise}', false, true, 11),
  ('multi_branch', 'Multi-Branch', 'تعدد الفروع', '{Starter,Pro,Enterprise}', false, true, 12);

-- Updated_at triggers
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_features_updated_at BEFORE UPDATE ON public.platform_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
