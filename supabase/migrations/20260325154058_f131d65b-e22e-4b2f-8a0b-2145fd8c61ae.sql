
-- Add missing columns to positions table
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS parent_position_id uuid REFERENCES public.positions(id);
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS is_manager boolean DEFAULT false;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS status text DEFAULT 'filled';
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
