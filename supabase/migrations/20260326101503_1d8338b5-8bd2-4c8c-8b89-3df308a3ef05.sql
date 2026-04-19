
-- 1. Add carry_over and max_carry_days to leave_types
ALTER TABLE public.leave_types
  ADD COLUMN IF NOT EXISTS allow_carry_over boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_carry_days integer NOT NULL DEFAULT 0;

-- 2. Add job_description to positions (for full position/job description)
ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS job_description text;

-- 3. Add spans_midnight to shifts for two-day resolution
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS spans_midnight boolean NOT NULL DEFAULT false;

-- 4. Add description and requirements to recruitment_jobs from position sync
ALTER TABLE public.recruitment_jobs
  ADD COLUMN IF NOT EXISTS position_description text,
  ADD COLUMN IF NOT EXISTS position_requirements text;
