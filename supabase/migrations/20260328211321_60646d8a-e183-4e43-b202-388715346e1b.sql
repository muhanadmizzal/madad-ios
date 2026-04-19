
-- Add manager_position_id to departments and branches
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS manager_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_manager_position ON public.departments(manager_position_id) WHERE manager_position_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_branches_manager_position ON public.branches(manager_position_id) WHERE manager_position_id IS NOT NULL;
