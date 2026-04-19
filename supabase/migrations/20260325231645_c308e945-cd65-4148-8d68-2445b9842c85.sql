
-- Add position_code and workflow_responsibilities to positions table
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS position_code text;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS workflow_responsibilities jsonb DEFAULT '{}'::jsonb;

-- Add index on position_code for fast lookup
CREATE INDEX IF NOT EXISTS idx_positions_code ON public.positions(position_code);
