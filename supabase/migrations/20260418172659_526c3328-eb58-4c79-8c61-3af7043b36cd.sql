
-- =====================================================================
-- Hybrid Local Runtime — Schema
-- =====================================================================

-- 1) Access requests
CREATE TABLE public.madad_local_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending','approved','rejected','cancelled')),
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_madad_local_access_requests_company ON public.madad_local_access_requests(company_id);
CREATE INDEX idx_madad_local_access_requests_status ON public.madad_local_access_requests(request_status);

-- 2) Local nodes (multi-node per tenant)
CREATE TABLE public.madad_local_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.madad_local_access_requests(id) ON DELETE SET NULL,
  node_name TEXT NOT NULL,
  node_status TEXT NOT NULL DEFAULT 'provisioned' CHECK (node_status IN ('provisioned','active','suspended','revoked')),
  activation_status TEXT NOT NULL DEFAULT 'pending' CHECK (activation_status IN ('pending','activated','expired')),
  provisioning_token_hash TEXT,
  provisioning_token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  sync_health TEXT NOT NULL DEFAULT 'unknown' CHECK (sync_health IN ('unknown','healthy','degraded','stale','error')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, node_name)
);
CREATE INDEX idx_madad_local_nodes_company ON public.madad_local_nodes(company_id);
CREATE INDEX idx_madad_local_nodes_status ON public.madad_local_nodes(node_status);

-- 3) Per-node module allow-list
CREATE TABLE public.madad_local_node_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_node_id UUID NOT NULL REFERENCES public.madad_local_nodes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_node_id, module_slug)
);
CREATE INDEX idx_madad_local_node_modules_node ON public.madad_local_node_modules(local_node_id);

-- 4) Per-node feature allow-list
CREATE TABLE public.madad_local_node_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_node_id UUID NOT NULL REFERENCES public.madad_local_nodes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_slug TEXT,
  feature_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_node_id, feature_key)
);
CREATE INDEX idx_madad_local_node_features_node ON public.madad_local_node_features(local_node_id);

-- 5) Sync logs
CREATE TABLE public.madad_local_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_node_id UUID NOT NULL REFERENCES public.madad_local_nodes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('local_to_cloud','cloud_to_local')),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success','partial','failed','skipped')),
  entity_type TEXT,
  entity_id TEXT,
  events_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_madad_local_sync_logs_node ON public.madad_local_sync_logs(local_node_id);
CREATE INDEX idx_madad_local_sync_logs_created ON public.madad_local_sync_logs(created_at DESC);

-- 6) Bind api_keys to a local node (optional)
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS local_node_id UUID REFERENCES public.madad_local_nodes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_api_keys_local_node ON public.api_keys(local_node_id);

-- =====================================================================
-- Helper: super-admin role check (security definer to avoid recursion)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- =====================================================================
-- updated_at triggers
-- =====================================================================
CREATE TRIGGER trg_madad_local_access_requests_updated_at
BEFORE UPDATE ON public.madad_local_access_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_madad_local_nodes_updated_at
BEFORE UPDATE ON public.madad_local_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE public.madad_local_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.madad_local_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.madad_local_node_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.madad_local_node_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.madad_local_sync_logs ENABLE ROW LEVEL SECURITY;

-- Access requests
CREATE POLICY "tenant_view_own_requests" ON public.madad_local_access_requests
  FOR SELECT USING (company_id = get_my_company_id() OR is_super_admin(auth.uid()));
CREATE POLICY "tenant_create_own_request" ON public.madad_local_access_requests
  FOR INSERT WITH CHECK (company_id = get_my_company_id() AND requested_by = auth.uid());
CREATE POLICY "tenant_cancel_own_request" ON public.madad_local_access_requests
  FOR UPDATE USING (
    (company_id = get_my_company_id() AND request_status = 'pending')
    OR is_super_admin(auth.uid())
  );

-- Nodes
CREATE POLICY "tenant_view_own_nodes" ON public.madad_local_nodes
  FOR SELECT USING (company_id = get_my_company_id() OR is_super_admin(auth.uid()));
CREATE POLICY "super_admin_manage_nodes_insert" ON public.madad_local_nodes
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "super_admin_manage_nodes_update" ON public.madad_local_nodes
  FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "super_admin_manage_nodes_delete" ON public.madad_local_nodes
  FOR DELETE USING (is_super_admin(auth.uid()));

-- Node modules / features
CREATE POLICY "tenant_view_node_modules" ON public.madad_local_node_modules
  FOR SELECT USING (company_id = get_my_company_id() OR is_super_admin(auth.uid()));
CREATE POLICY "super_admin_write_node_modules" ON public.madad_local_node_modules
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "tenant_view_node_features" ON public.madad_local_node_features
  FOR SELECT USING (company_id = get_my_company_id() OR is_super_admin(auth.uid()));
CREATE POLICY "super_admin_write_node_features" ON public.madad_local_node_features
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Sync logs
CREATE POLICY "tenant_view_sync_logs" ON public.madad_local_sync_logs
  FOR SELECT USING (company_id = get_my_company_id() OR is_super_admin(auth.uid()));
-- Inserts come from the edge function via service role, no INSERT policy needed.

-- =====================================================================
-- Function: tenant requests local access
-- =====================================================================
CREATE OR REPLACE FUNCTION public.request_local_access(p_notes TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
  v_id UUID;
BEGIN
  v_company := get_my_company_id();
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'No company context';
  END IF;
  -- Block if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM public.madad_local_access_requests
    WHERE company_id = v_company AND request_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending request already exists';
  END IF;
  INSERT INTO public.madad_local_access_requests (company_id, requested_by, notes)
  VALUES (v_company, auth.uid(), p_notes)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- =====================================================================
-- Function: snapshot tenant subscription into a node's allow-list
-- =====================================================================
CREATE OR REPLACE FUNCTION public.refresh_local_node_entitlements(p_node_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
  v_modules INTEGER := 0;
  v_features INTEGER := 0;
BEGIN
  SELECT company_id INTO v_company FROM public.madad_local_nodes WHERE id = p_node_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Node not found';
  END IF;

  -- Wipe & rebuild allow-lists from current cloud entitlements.
  DELETE FROM public.madad_local_node_modules WHERE local_node_id = p_node_id;
  DELETE FROM public.madad_local_node_features WHERE local_node_id = p_node_id;

  -- Modules: from tenant_subscription_modules (active)
  INSERT INTO public.madad_local_node_modules (local_node_id, company_id, module_slug, status)
  SELECT DISTINCT p_node_id, v_company, m.module_key, 'active'
  FROM public.tenant_subscription_modules m
  WHERE m.company_id = v_company
    AND COALESCE(m.is_active, true) = true;
  GET DIAGNOSTICS v_modules = ROW_COUNT;

  -- Features: from tenant_features (active)
  INSERT INTO public.madad_local_node_features (local_node_id, company_id, feature_key, status)
  SELECT DISTINCT p_node_id, v_company, f.feature_key, 'active'
  FROM public.tenant_features f
  WHERE f.company_id = v_company
    AND f.status = 'active';
  GET DIAGNOSTICS v_features = ROW_COUNT;

  UPDATE public.madad_local_nodes
  SET updated_at = now()
  WHERE id = p_node_id;

  RETURN json_build_object('modules', v_modules, 'features', v_features);
END;
$$;

-- =====================================================================
-- Function: super-admin provisions a local node (approves request)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.provision_local_node(
  p_request_id UUID,
  p_node_name TEXT,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_node_id UUID;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super_admin can provision nodes';
  END IF;

  SELECT company_id INTO v_company
  FROM public.madad_local_access_requests
  WHERE id = p_request_id AND request_status = 'pending';
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  v_token := 'ltk_' || encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token::bytea, 'sha256'), 'hex');

  INSERT INTO public.madad_local_nodes (
    company_id, request_id, node_name, node_status, activation_status,
    provisioning_token_hash, provisioning_token_expires_at, created_by
  )
  VALUES (
    v_company, p_request_id, p_node_name, 'provisioned', 'pending',
    v_token_hash, now() + interval '7 days', auth.uid()
  )
  RETURNING id INTO v_node_id;

  PERFORM public.refresh_local_node_entitlements(v_node_id);

  UPDATE public.madad_local_access_requests
  SET request_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes
  WHERE id = p_request_id;

  RETURN json_build_object(
    'node_id', v_node_id,
    'provisioning_token', v_token,
    'expires_at', (now() + interval '7 days')
  );
END;
$$;

-- =====================================================================
-- Function: reject request
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reject_local_access_request(
  p_request_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super_admin can reject requests';
  END IF;
  UPDATE public.madad_local_access_requests
  SET request_status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes
  WHERE id = p_request_id AND request_status = 'pending';
END;
$$;

-- =====================================================================
-- Function: tenant cancels own pending request
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cancel_local_access_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.madad_local_access_requests
  SET request_status = 'cancelled'
  WHERE id = p_request_id
    AND company_id = get_my_company_id()
    AND request_status = 'pending';
END;
$$;

-- =====================================================================
-- Function: super-admin sets node status (suspend/activate/revoke)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_local_node_status(
  p_node_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super_admin can change node status';
  END IF;
  IF p_status NOT IN ('provisioned','active','suspended','revoked') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.madad_local_nodes
  SET node_status = p_status, updated_at = now()
  WHERE id = p_node_id;
  -- If revoked, also deactivate any bound API keys
  IF p_status = 'revoked' THEN
    UPDATE public.api_keys SET is_active = false, updated_at = now()
    WHERE local_node_id = p_node_id;
  END IF;
END;
$$;
