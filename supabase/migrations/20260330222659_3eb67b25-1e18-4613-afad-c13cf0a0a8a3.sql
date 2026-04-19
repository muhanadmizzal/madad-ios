
-- Employee uploaded documents table with full workflow fields
CREATE TABLE public.employee_uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploader_user_id UUID NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  visibility_scope TEXT NOT NULL DEFAULT 'employee',
  version INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES public.employee_uploaded_documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_uploaded_documents ENABLE ROW LEVEL SECURITY;

-- Employee can view own docs
CREATE POLICY "employee_view_own_uploads" ON public.employee_uploaded_documents
  FOR SELECT TO authenticated
  USING (
    uploader_user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

-- Employee can insert own docs
CREATE POLICY "employee_insert_own_uploads" ON public.employee_uploaded_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploader_user_id = auth.uid()
    AND company_id = public.get_my_company_id()
  );

-- HR/admin can update (approve/reject)
CREATE POLICY "hr_update_uploads" ON public.employee_uploaded_documents
  FOR UPDATE TO authenticated
  USING (company_id = public.get_my_company_id());

-- Index for fast lookups
CREATE INDEX idx_emp_uploads_employee ON public.employee_uploaded_documents(employee_id);
CREATE INDEX idx_emp_uploads_company ON public.employee_uploaded_documents(company_id);
CREATE INDEX idx_emp_uploads_status ON public.employee_uploaded_documents(status);

-- Storage bucket for employee uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-uploads', 'employee-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "employee_upload_own_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-uploads');

CREATE POLICY "employee_read_own_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'employee-uploads');
