
-- ============================================
-- 1. Feature Change Requests table
-- ============================================
CREATE TABLE public.feature_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('activate', 'deactivate')),
  feature_key TEXT NOT NULL,
  estimated_monthly_impact NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_change_requests ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own requests
CREATE POLICY "Tenants view own feature requests"
  ON public.feature_change_requests FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());

-- Tenants can create requests for their company
CREATE POLICY "Tenants create feature requests"
  ON public.feature_change_requests FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company_id() AND requested_by = auth.uid());

-- Tenants can cancel their own pending requests
CREATE POLICY "Tenants cancel own pending requests"
  ON public.feature_change_requests FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND requested_by = auth.uid() AND status = 'pending')
  WITH CHECK (company_id = get_my_company_id() AND status = 'cancelled');

-- Super/business admins can manage all requests
CREATE POLICY "Platform admins manage feature requests"
  ON public.feature_change_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'business_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'business_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_feature_change_requests_updated_at
  BEFORE UPDATE ON public.feature_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. Function to approve a feature request
-- ============================================
CREATE OR REPLACE FUNCTION public.approve_feature_request(p_request_id UUID, p_reviewer_notes TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req RECORD;
BEGIN
  SELECT * INTO v_req FROM feature_change_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  -- Update request status
  UPDATE feature_change_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_reviewer_notes
  WHERE id = p_request_id;

  -- Apply the change
  IF v_req.action = 'activate' THEN
    INSERT INTO tenant_features (company_id, feature_key, status, activated_by, activated_at, updated_at)
    VALUES (v_req.company_id, v_req.feature_key, 'active', v_req.requested_by, now(), now())
    ON CONFLICT (company_id, feature_key) DO UPDATE SET status = 'active', updated_at = now();
  ELSIF v_req.action = 'deactivate' THEN
    DELETE FROM tenant_features WHERE company_id = v_req.company_id AND feature_key = v_req.feature_key;
  END IF;
END;
$$;

-- ============================================
-- 3. Function to reject a feature request
-- ============================================
CREATE OR REPLACE FUNCTION public.reject_feature_request(p_request_id UUID, p_reviewer_notes TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE feature_change_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_reviewer_notes
  WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
END;
$$;

-- ============================================
-- 4. Fix billing_invoices RLS
-- ============================================
-- Drop incomplete policies
DROP POLICY IF EXISTS "Admins can view own invoices" ON public.billing_invoices;
DROP POLICY IF EXISTS "Super admins can manage invoices" ON public.billing_invoices;

-- Tenants can view their own invoices
CREATE POLICY "Tenants view own invoices"
  ON public.billing_invoices FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());

-- Platform admins full access
CREATE POLICY "Platform admins manage invoices"
  ON public.billing_invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'business_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'business_admin'::app_role));
