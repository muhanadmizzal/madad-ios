
-- ============================================
-- Feature Catalog: canonical list of all features
-- ============================================
CREATE TABLE public.feature_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ar text,
  category text NOT NULL DEFAULT 'core',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read feature_catalog"
  ON public.feature_catalog FOR SELECT TO authenticated USING (true);

-- Seed features
INSERT INTO public.feature_catalog (key, name, name_ar, category, description) VALUES
  ('hr_core', 'HR Core', 'الموارد البشرية الأساسية', 'core', 'Core HR management'),
  ('employee_management', 'Employee Management', 'إدارة الموظفين', 'core', 'Employee records and profiles'),
  ('attendance', 'Attendance', 'الحضور والانصراف', 'hr', 'Attendance tracking and management'),
  ('leave_management', 'Leave Management', 'إدارة الإجازات', 'hr', 'Leave requests and balances'),
  ('payroll', 'Payroll', 'الرواتب', 'hr', 'Payroll processing and management'),
  ('recruitment', 'Recruitment', 'التوظيف', 'hr', 'Recruitment and hiring pipeline'),
  ('performance', 'Performance', 'الأداء', 'hr', 'Performance appraisals and reviews'),
  ('training', 'Training', 'التدريب', 'hr', 'Training and development'),
  ('documents', 'Documents', 'المستندات', 'hr', 'Document management and generation'),
  ('advanced_analytics', 'Advanced Analytics', 'التحليلات المتقدمة', 'analytics', 'Advanced reporting and analytics'),
  ('multi_branch', 'Multi Branch', 'تعدد الفروع', 'admin', 'Multi-branch management'),
  ('org_chart', 'Org Chart', 'الهيكل التنظيمي', 'admin', 'Organizational structure management'),
  ('ai_hr_assistant', 'AI HR Assistant', 'مساعد الموارد البشرية الذكي', 'ai', 'AI-powered HR assistant'),
  ('ai_workforce_analytics', 'AI Workforce Analytics', 'تحليلات القوى العاملة الذكية', 'ai', 'AI workforce analytics'),
  ('ai_recruitment_intelligence', 'AI Recruitment Intelligence', 'ذكاء التوظيف', 'ai', 'AI recruitment intelligence'),
  ('ai_employee_career_coach', 'AI Career Coach', 'المدرب المهني الذكي', 'ai', 'AI employee career coaching'),
  ('ai_gap_analysis', 'AI Gap Analysis', 'تحليل الفجوات الذكي', 'ai', 'AI gap analysis'),
  ('ai_planning_advisor', 'AI Planning Advisor', 'مستشار التخطيط الذكي', 'ai', 'AI planning and advisory');

-- ============================================
-- Position Feature Assignments
-- ============================================
CREATE TABLE public.position_feature_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(position_id, feature_key)
);

ALTER TABLE public.position_feature_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read position_feature_assignments"
  ON public.position_feature_assignments FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Company admins can manage position_feature_assignments"
  ON public.position_feature_assignments FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- ============================================
-- Add included_features to subscription_plans
-- ============================================
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS included_features jsonb DEFAULT '[]'::jsonb;
