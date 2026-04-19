
-- =============================================
-- REQUEST DOCUMENTS: Persistent official records
-- =============================================

-- Sequence for reference numbers
CREATE SEQUENCE IF NOT EXISTS request_document_seq START 1;

CREATE TABLE public.request_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  reference_id text, -- original request id
  request_type text NOT NULL,
  reference_number text NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  requester_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  
  -- Snapshot data (JSONB for flexible storage across request types)
  request_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  employee_snapshot jsonb DEFAULT '{}'::jsonb,
  company_snapshot jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz
);

-- Unique reference number per company
CREATE UNIQUE INDEX idx_request_documents_ref_number ON public.request_documents(company_id, reference_number);
CREATE INDEX idx_request_documents_employee ON public.request_documents(employee_id);
CREATE INDEX idx_request_documents_workflow ON public.request_documents(workflow_instance_id);
CREATE INDEX idx_request_documents_company_type ON public.request_documents(company_id, request_type);

-- Enable RLS
ALTER TABLE public.request_documents ENABLE ROW LEVEL SECURITY;

-- Employee can view their own records
CREATE POLICY "employees_view_own_request_docs" ON public.request_documents
  FOR SELECT TO authenticated
  USING (
    requester_user_id = auth.uid()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- HR/Admin can view all company records
CREATE POLICY "hr_view_company_request_docs" ON public.request_documents
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'tenant_admin')
      OR public.has_role(auth.uid(), 'hr_manager')
      OR public.has_role(auth.uid(), 'hr_officer')
    )
  );

-- Manager can view direct reports' records
CREATE POLICY "manager_view_reports_request_docs" ON public.request_documents
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND public.has_role(auth.uid(), 'manager')
    AND employee_id IN (SELECT id FROM public.employees WHERE manager_user_id = auth.uid())
  );

-- System insert/update (via trigger/function)
CREATE POLICY "system_manage_request_docs" ON public.request_documents
  FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Function to generate reference number
CREATE OR REPLACE FUNCTION public.generate_request_reference(p_company_id uuid, p_request_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq int;
  v_month text;
BEGIN
  v_month := to_char(CURRENT_DATE, 'YYMM');
  
  CASE p_request_type
    WHEN 'leave' THEN v_prefix := 'LV';
    WHEN 'certificate' THEN v_prefix := 'CT';
    WHEN 'certificate_experience' THEN v_prefix := 'CT';
    WHEN 'certificate_salary' THEN v_prefix := 'CT';
    WHEN 'certificate_employment' THEN v_prefix := 'CT';
    WHEN 'attendance_correction' THEN v_prefix := 'AC';
    WHEN 'payroll' THEN v_prefix := 'PR';
    WHEN 'contract' THEN v_prefix := 'CN';
    WHEN 'document' THEN v_prefix := 'DC';
    WHEN 'onboarding' THEN v_prefix := 'OB';
    WHEN 'final_settlement' THEN v_prefix := 'FS';
    ELSE v_prefix := 'RQ';
  END CASE;
  
  v_seq := nextval('request_document_seq');
  
  RETURN v_prefix || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- Function to create/update request document from workflow instance
CREATE OR REPLACE FUNCTION public.upsert_request_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_id uuid;
  v_ref_number text;
  v_employee_id uuid;
  v_employee_data jsonb;
  v_company_data jsonb;
  v_request_data jsonb;
  v_approval_history jsonb;
BEGIN
  -- Check if document already exists for this workflow
  SELECT id INTO v_doc_id FROM request_documents WHERE workflow_instance_id = NEW.id;
  
  -- Resolve employee_id from reference
  CASE NEW.request_type
    WHEN 'leave' THEN
      SELECT e.id, jsonb_build_object(
        'name_ar', e.name_ar, 'name_en', e.name_en, 'employee_code', e.employee_code,
        'position', e.position, 'department', d.name, 'branch', b.name
      ) INTO v_employee_id, v_employee_data
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN branches b ON b.id = e.branch_id
      WHERE lr.id = NEW.reference_id::uuid;
      
      SELECT jsonb_build_object(
        'leave_type', lt.name, 'start_date', lr.start_date, 'end_date', lr.end_date,
        'reason', lr.reason, 'status', lr.status,
        'days', (lr.end_date::date - lr.start_date::date + 1)
      ) INTO v_request_data
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.id = NEW.reference_id::uuid;
      
    WHEN 'attendance_correction' THEN
      SELECT e.id, jsonb_build_object(
        'name_ar', e.name_ar, 'name_en', e.name_en, 'employee_code', e.employee_code,
        'position', e.position, 'department', d.name
      ) INTO v_employee_id, v_employee_data
      FROM attendance_corrections ac
      JOIN employees e ON e.id = ac.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE ac.id = NEW.reference_id::uuid;
      
      SELECT jsonb_build_object(
        'date', ac.date, 'reason', ac.reason,
        'requested_check_in', ac.requested_check_in,
        'requested_check_out', ac.requested_check_out,
        'status', ac.status
      ) INTO v_request_data
      FROM attendance_corrections ac
      WHERE ac.id = NEW.reference_id::uuid;
      
    ELSE
      -- For certificate and other types, try approval_requests
      SELECT e.id, jsonb_build_object(
        'name_ar', e.name_ar, 'name_en', e.name_en, 'employee_code', e.employee_code,
        'position', e.position, 'department', d.name
      ) INTO v_employee_id, v_employee_data
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.user_id = NEW.requester_user_id;
      
      -- Try to get request data from approval_requests
      SELECT jsonb_build_object(
        'request_type', ar.request_type, 'comments', ar.comments,
        'status', ar.status
      ) INTO v_request_data
      FROM approval_requests ar
      WHERE ar.id = NEW.reference_id::uuid;
  END CASE;
  
  v_request_data := COALESCE(v_request_data, '{}'::jsonb);
  v_employee_data := COALESCE(v_employee_data, '{}'::jsonb);
  
  -- Get company snapshot
  SELECT jsonb_build_object(
    'name', c.name, 'name_ar', c.name_ar, 'logo_url', c.logo_url,
    'address', c.address, 'phone', c.phone, 'email', c.email,
    'website', c.website, 'primary_color', c.primary_color,
    'header_template', c.header_template, 'footer_template', c.footer_template,
    'signatory_name', c.signatory_name, 'signatory_title', c.signatory_title,
    'stamp_url', c.stamp_url, 'registration_number', c.registration_number,
    'tax_number', c.tax_number
  ) INTO v_company_data
  FROM companies c WHERE c.id = NEW.company_id;
  
  -- Get approval history
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'action', aa.action, 'actor_name', COALESCE(p.full_name, 'مستخدم'),
    'actor_role', ur.role, 'comments', aa.comments,
    'from_status', aa.from_status, 'to_status', aa.to_status,
    'step_order', aa.step_order, 'created_at', aa.created_at,
    'has_signature', aa.signature_data IS NOT NULL
  ) ORDER BY aa.created_at), '[]'::jsonb)
  INTO v_approval_history
  FROM approval_actions aa
  LEFT JOIN profiles p ON p.user_id = aa.actor_user_id
  LEFT JOIN user_roles ur ON ur.user_id = aa.actor_user_id AND ur.scope_type = 'tenant' AND ur.tenant_id = NEW.company_id
  WHERE aa.instance_id = NEW.id;
  
  IF v_doc_id IS NOT NULL THEN
    -- Update existing document
    UPDATE request_documents SET
      status = NEW.status,
      request_data = v_request_data,
      approval_history = v_approval_history,
      employee_snapshot = v_employee_data,
      company_snapshot = COALESCE(v_company_data, company_snapshot),
      updated_at = now(),
      finalized_at = CASE WHEN NEW.status IN ('approved', 'rejected', 'locked') THEN now() ELSE finalized_at END
    WHERE id = v_doc_id;
  ELSE
    -- Create new document
    v_ref_number := generate_request_reference(NEW.company_id, NEW.request_type);
    
    INSERT INTO request_documents (
      company_id, workflow_instance_id, reference_id, request_type,
      reference_number, employee_id, requester_user_id, status,
      request_data, approval_history, employee_snapshot, company_snapshot
    ) VALUES (
      NEW.company_id, NEW.id, NEW.reference_id, NEW.request_type,
      v_ref_number, v_employee_id, NEW.requester_user_id, NEW.status,
      v_request_data, v_approval_history, v_employee_data, COALESCE(v_company_data, '{}'::jsonb)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on workflow_instances
CREATE TRIGGER trg_upsert_request_document
  AFTER INSERT OR UPDATE ON public.workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_request_document();

-- Backfill existing workflow instances
DO $$
DECLARE
  v_wi RECORD;
BEGIN
  FOR v_wi IN SELECT * FROM workflow_instances ORDER BY created_at
  LOOP
    -- Trigger the upsert function by doing a no-op update
    UPDATE workflow_instances SET updated_at = updated_at WHERE id = v_wi.id;
  END LOOP;
END $$;
