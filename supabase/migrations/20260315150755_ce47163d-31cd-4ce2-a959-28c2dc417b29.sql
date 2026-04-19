
-- Tenant AI feature flags
CREATE TABLE public.tenant_ai_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  ai_hr_assistant boolean DEFAULT true,
  ai_workforce_analytics boolean DEFAULT true,
  ai_recruitment_intelligence boolean DEFAULT true,
  ai_employee_career_coach boolean DEFAULT false,
  ai_gap_analysis boolean DEFAULT true,
  ai_planning_advisor boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenant_ai_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for tenant_ai_features" ON public.tenant_ai_features
  FOR ALL USING (company_id = public.get_my_company_id());
