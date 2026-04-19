
-- Add shift_id to employees for shift assignment
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id) DEFAULT NULL;

-- Add score to training_enrollments for completion tracking
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT NULL;
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- Add expiry notification sent flag to documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS expiry_notified BOOLEAN DEFAULT false;
