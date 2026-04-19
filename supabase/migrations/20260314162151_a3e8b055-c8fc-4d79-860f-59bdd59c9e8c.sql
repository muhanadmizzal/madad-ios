
-- Add branding columns to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS stamp_url text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS header_template text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tax_number text;

-- Create digital signatures table
CREATE TABLE public.digital_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  document_id uuid,
  document_type text NOT NULL DEFAULT 'approval',
  signature_data text NOT NULL,
  signature_type text NOT NULL DEFAULT 'drawn',
  ip_address text,
  document_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own signatures" ON public.digital_signatures
FOR INSERT TO authenticated
WITH CHECK (company_id = get_my_company_id() AND user_id = auth.uid());

CREATE POLICY "Users can view company signatures" ON public.digital_signatures
FOR SELECT TO authenticated
USING (company_id = get_my_company_id());

-- Create branding storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload branding" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding');

CREATE POLICY "Public can view branding" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'branding');
