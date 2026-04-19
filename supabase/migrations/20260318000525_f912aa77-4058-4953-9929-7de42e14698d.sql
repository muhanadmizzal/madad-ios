-- Add reminder_sent to interview_schedules
ALTER TABLE public.interview_schedules 
  ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT null;

-- Add upload_token fields to background_checks for candidate doc upload
ALTER TABLE public.background_checks 
  ADD COLUMN IF NOT EXISTS upload_token text UNIQUE DEFAULT null,
  ADD COLUMN IF NOT EXISTS upload_token_expires_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT null;
