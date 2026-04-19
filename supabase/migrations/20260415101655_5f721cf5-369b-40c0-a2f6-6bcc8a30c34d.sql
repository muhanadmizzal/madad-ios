
-- Tathbeet AI Insights
CREATE TABLE public.tathbeet_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL DEFAULT 'general',
  scope_type TEXT NOT NULL DEFAULT 'system',
  scope_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  recommendation TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tathbeet_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their AI insights"
  ON public.tathbeet_ai_insights FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can insert AI insights"
  ON public.tathbeet_ai_insights FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_tathbeet_ai_insights_company ON public.tathbeet_ai_insights(company_id);

-- Tathbeet AI Recommendations
CREATE TABLE public.tathbeet_ai_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL DEFAULT 'general',
  target_type TEXT NOT NULL DEFAULT 'system',
  target_id UUID,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tathbeet_ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their AI recommendations"
  ON public.tathbeet_ai_recommendations FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can insert AI recommendations"
  ON public.tathbeet_ai_recommendations FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can update their AI recommendations"
  ON public.tathbeet_ai_recommendations FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_tathbeet_ai_recs_company ON public.tathbeet_ai_recommendations(company_id);

-- Tathbeet AI Snapshots
CREATE TABLE public.tathbeet_ai_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metrics_json JSONB DEFAULT '{}',
  summary_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, snapshot_date)
);

ALTER TABLE public.tathbeet_ai_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their AI snapshots"
  ON public.tathbeet_ai_snapshots FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can insert AI snapshots"
  ON public.tathbeet_ai_snapshots FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_tathbeet_ai_snapshots_company ON public.tathbeet_ai_snapshots(company_id);
