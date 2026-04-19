
-- Add missing lifecycle fields to generated_documents
ALTER TABLE public.generated_documents 
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_immutable boolean NOT NULL DEFAULT false;

-- Create private storage bucket for official documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('official-documents', 'official-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: HR/admin can upload
CREATE POLICY "HR can upload official documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'official-documents'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Storage RLS: tenant members can read own company docs
CREATE POLICY "Tenant members can read official documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'official-documents'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- RLS on generated_documents: employee sees only own released docs
DROP POLICY IF EXISTS "Employees can view own released documents" ON public.generated_documents;
CREATE POLICY "Employees can view own released documents"
ON public.generated_documents FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    -- HR/admin see all
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager') OR public.has_role(auth.uid(), 'hr_officer')
    -- Employee sees own released/approved/final docs
    OR (
      employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND visibility_scope IN ('employee', 'all')
      AND status IN ('final', 'approved', 'signed', 'released')
    )
  )
);

-- HR can insert
DROP POLICY IF EXISTS "HR can insert generated documents" ON public.generated_documents;
CREATE POLICY "HR can insert generated documents"
ON public.generated_documents FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager') OR public.has_role(auth.uid(), 'hr_officer'))
);

-- HR can update non-immutable docs
DROP POLICY IF EXISTS "HR can update generated documents" ON public.generated_documents;
CREATE POLICY "HR can update generated documents"
ON public.generated_documents FOR UPDATE TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND is_immutable = false
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager') OR public.has_role(auth.uid(), 'hr_officer'))
);

-- Update process_approval_action to handle generated_documents
-- Add generated_document sync in existing function
CREATE OR REPLACE FUNCTION public.sync_generated_document_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a workflow for a generated document is approved/rejected
  IF NEW.request_type = 'generated_document' AND NEW.status IN ('approved', 'rejected', 'returned') THEN
    UPDATE generated_documents SET
      status = CASE NEW.status
        WHEN 'approved' THEN 'approved'
        WHEN 'rejected' THEN 'draft'
        WHEN 'returned' THEN 'draft'
      END,
      approved_by = CASE WHEN NEW.status = 'approved' THEN (
        SELECT actor_user_id FROM approval_actions WHERE instance_id = NEW.id ORDER BY created_at DESC LIMIT 1
      ) ELSE approved_by END,
      approved_at = CASE WHEN NEW.status = 'approved' THEN now() ELSE approved_at END,
      is_immutable = CASE WHEN NEW.status = 'approved' THEN true ELSE false END,
      updated_at = now()
    WHERE id = NEW.reference_id::uuid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_generated_document_approval ON workflow_instances;
CREATE TRIGGER trg_sync_generated_document_approval
  AFTER UPDATE OF status ON workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION sync_generated_document_approval();
