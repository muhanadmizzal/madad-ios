
-- API Keys table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['v1:read'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage api_keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id());

-- API Access Logs table
CREATE TABLE public.api_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INT NOT NULL DEFAULT 200,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view api_access_logs"
  ON public.api_access_logs FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

-- API Settings table (per-tenant toggle)
CREATE TABLE public.api_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  api_enabled BOOLEAN NOT NULL DEFAULT false,
  allowed_origins TEXT[] DEFAULT ARRAY[]::TEXT[],
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage api_settings"
  ON public.api_settings FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id());

-- Indexes
CREATE INDEX idx_api_keys_company ON public.api_keys(company_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_access_logs_company ON public.api_access_logs(company_id);
CREATE INDEX idx_api_access_logs_created ON public.api_access_logs(created_at DESC);

-- Helper: generate API key RPC (returns plaintext key once, stores hash)
CREATE OR REPLACE FUNCTION public.generate_api_key(
  p_company_id UUID,
  p_name TEXT DEFAULT 'Default',
  p_scopes TEXT[] DEFAULT ARRAY['v1:read']
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_key TEXT;
  v_hash TEXT;
  v_prefix TEXT;
  v_id UUID;
BEGIN
  -- Only allow if user belongs to this company
  IF p_company_id != get_my_company_id() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  v_raw_key := 'tmk_' || encode(gen_random_bytes(32), 'hex');
  v_prefix := substring(v_raw_key from 1 for 12);
  v_hash := encode(digest(v_raw_key::bytea, 'sha256'), 'hex');
  
  INSERT INTO api_keys (company_id, name, key_hash, key_prefix, scopes, created_by)
  VALUES (p_company_id, p_name, v_hash, v_prefix, p_scopes, auth.uid())
  RETURNING id INTO v_id;
  
  RETURN json_build_object('id', v_id, 'key', v_raw_key, 'prefix', v_prefix);
END;
$$;

-- Helper: revoke API key
CREATE OR REPLACE FUNCTION public.revoke_api_key(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE api_keys SET is_active = false, updated_at = now()
  WHERE id = p_key_id AND company_id = get_my_company_id();
END;
$$;

-- Ensure pgcrypto for digest function
CREATE EXTENSION IF NOT EXISTS pgcrypto;
