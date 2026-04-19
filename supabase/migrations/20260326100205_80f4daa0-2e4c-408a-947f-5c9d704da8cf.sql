
ALTER TABLE public.recruitment_jobs
ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.recruitment_jobs.position_id IS 'Links recruitment job to an org chart position marked as hiring';
