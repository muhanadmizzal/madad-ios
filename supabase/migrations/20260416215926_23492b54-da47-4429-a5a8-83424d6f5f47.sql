
CREATE TABLE IF NOT EXISTS public.events_log (
  event_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  sequence BIGINT,
  event_timestamp TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  error_message TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_log_tenant ON public.events_log(tenant_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_log_entity ON public.events_log(entity, entity_id);

ALTER TABLE public.events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages events_log"
  ON public.events_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Tenant admins view their events_log"
  ON public.events_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = events_log.tenant_id
        AND ur.role::text IN ('tenant_admin','admin','super_admin')
    )
  );

CREATE TABLE IF NOT EXISTS public.sync_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  total_events INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  status_code INTEGER NOT NULL,
  ip_address TEXT,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_attempts_tenant ON public.sync_attempts(tenant_id, created_at DESC);

ALTER TABLE public.sync_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages sync_attempts"
  ON public.sync_attempts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Tenant admins view their sync_attempts"
  ON public.sync_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = sync_attempts.tenant_id
        AND ur.role::text IN ('tenant_admin','admin','super_admin')
    )
  );
