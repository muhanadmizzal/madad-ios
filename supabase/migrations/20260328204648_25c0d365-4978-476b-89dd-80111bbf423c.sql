
-- Add diagram layout columns to positions
ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS diagram_x double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diagram_y double precision DEFAULT NULL;

-- Add diagram layout columns to departments
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS diagram_x double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diagram_y double precision DEFAULT NULL;
