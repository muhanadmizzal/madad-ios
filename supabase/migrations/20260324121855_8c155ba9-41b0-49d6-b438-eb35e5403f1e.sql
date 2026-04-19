
ALTER TABLE public.recruitment_jobs ADD COLUMN IF NOT EXISTS agency_client_id UUID REFERENCES public.agency_clients(id) ON DELETE SET NULL;
