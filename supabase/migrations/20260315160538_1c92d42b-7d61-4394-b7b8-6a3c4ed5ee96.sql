
-- AI audit trail table
CREATE TABLE public.ai_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  record_id TEXT,
  feature TEXT NOT NULL,
  prompt_summary TEXT,
  output_summary TEXT,
  action_taken TEXT,
  structured_output JSONB,
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company AI audit trail"
  ON public.ai_audit_trail FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Users can insert own AI audit trail"
  ON public.ai_audit_trail FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id() AND user_id = auth.uid());

-- Tenant AI quotas table
CREATE TABLE public.tenant_ai_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  package TEXT NOT NULL DEFAULT 'essentials',
  monthly_request_limit INTEGER NOT NULL DEFAULT 50,
  monthly_token_limit INTEGER NOT NULL DEFAULT 100000,
  requests_used INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  billing_cycle_start DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_ai_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company AI quotas"
  ON public.tenant_ai_quotas FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Users can update own company AI quotas"
  ON public.tenant_ai_quotas FOR UPDATE TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Users can insert own company AI quotas"
  ON public.tenant_ai_quotas FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

-- Index for audit trail lookups
CREATE INDEX idx_ai_audit_trail_company ON public.ai_audit_trail(company_id, created_at DESC);
CREATE INDEX idx_ai_audit_trail_user ON public.ai_audit_trail(user_id, created_at DESC);
CREATE INDEX idx_tenant_ai_quotas_company ON public.tenant_ai_quotas(company_id);
