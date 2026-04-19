-- Add AI skill summary and additional fields for Talent Bank profiles
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS ai_skill_summary text,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamptz;

-- Add external interviewer token support for interview evaluation
ALTER TABLE public.interview_schedules
  ADD COLUMN IF NOT EXISTS eval_token text,
  ADD COLUMN IF NOT EXISTS eval_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_interviewer_email text,
  ADD COLUMN IF NOT EXISTS external_interviewer_name text;

-- Create index for eval_token lookup
CREATE INDEX IF NOT EXISTS idx_interview_eval_token ON public.interview_schedules (eval_token) WHERE eval_token IS NOT NULL;
