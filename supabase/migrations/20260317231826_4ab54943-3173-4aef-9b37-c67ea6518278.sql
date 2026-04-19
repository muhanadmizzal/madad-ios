
-- Fix branches policy: allow hr_manager and tenant_admin to manage branches
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
CREATE POLICY "Admins can manage branches" ON public.branches
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'tenant_admin'::app_role)
      OR has_role(auth.uid(), 'hr_manager'::app_role)
    )
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'tenant_admin'::app_role)
      OR has_role(auth.uid(), 'hr_manager'::app_role)
    )
  );

-- Fix leave_requests: allow hr_manager to also insert leave requests
DROP POLICY IF EXISTS "Users can insert leave requests" ON public.leave_requests;
CREATE POLICY "Users can insert leave requests" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- Ensure delete policy exists for leave_requests (admin/hr)
DROP POLICY IF EXISTS "Admins can delete leave requests" ON public.leave_requests;
CREATE POLICY "Admins can delete leave requests" ON public.leave_requests
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'hr_manager'::app_role)
    )
  );
