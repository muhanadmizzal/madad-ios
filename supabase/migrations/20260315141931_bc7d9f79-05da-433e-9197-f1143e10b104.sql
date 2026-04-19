
-- Add branding fields to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS footer_template text,
  ADD COLUMN IF NOT EXISTS signatory_name text,
  ADD COLUMN IF NOT EXISTS signatory_title text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS secondary_color text;

-- Create generated_documents table
CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  document_type text NOT NULL DEFAULT 'letter',
  template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  workflow_instance_id uuid,
  file_path text,
  content text,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  generated_by uuid,
  approved_by uuid,
  visibility_scope text NOT NULL DEFAULT 'hr',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- HR/Admin can manage all tenant documents
CREATE POLICY "tenant_hr_manage_generated_docs" ON public.generated_documents
  FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id());

-- Create document access logs
CREATE TABLE public.document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES public.generated_documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'view',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access_logs" ON public.document_access_logs
  FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id());

-- Add more template types
ALTER TABLE public.document_templates 
  DROP CONSTRAINT IF EXISTS document_templates_type_check;
