ALTER TABLE public.positions 
  ADD COLUMN IF NOT EXISTS allowances jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS talent_requirements jsonb DEFAULT '{}'::jsonb;