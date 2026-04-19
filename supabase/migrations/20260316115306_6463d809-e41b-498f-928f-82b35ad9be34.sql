-- Ensure official-documents storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('official-documents', 'official-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for official-documents bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'HR can upload official documents' AND tablename = 'objects') THEN
    CREATE POLICY "HR can upload official documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'official-documents'
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'hr_manager', 'hr_officer', 'tenant_admin')
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own company official docs' AND tablename = 'objects') THEN
    CREATE POLICY "Users read own company official docs"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'official-documents'
      AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    );
  END IF;
END $$;