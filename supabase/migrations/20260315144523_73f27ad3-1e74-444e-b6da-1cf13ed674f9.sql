
-- Add PDF metadata fields to generated_documents
ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS mime_type text DEFAULT 'text/html',
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_hash text,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;
