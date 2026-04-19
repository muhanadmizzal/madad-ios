
-- Add branch_id and import tracking to positions
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS created_from text DEFAULT 'manual';
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS import_batch_id text;

-- Index for import matching
CREATE INDEX IF NOT EXISTS idx_positions_branch_id ON public.positions(branch_id);
CREATE INDEX IF NOT EXISTS idx_positions_import_batch ON public.positions(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_positions_dept_status ON public.positions(company_id, department_id, status);
