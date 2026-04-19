-- Drop the duplicate text-parameter overload of create_workflow_instance
DROP FUNCTION IF EXISTS public.create_workflow_instance(text, text, uuid);

-- Recreate the SELECT policy on approval_requests (was rolled back)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_requests' AND policyname = 'Users can view own approval requests') THEN
    CREATE POLICY "Users can view own approval requests"
    ON public.approval_requests
    FOR SELECT
    TO authenticated
    USING (
      company_id = get_my_company_id()
      AND (
        requester_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'tenant_admin'::app_role)
        OR has_role(auth.uid(), 'hr_manager'::app_role)
      )
    );
  END IF;
END $$;

-- Fix approval_requests INSERT policy
DROP POLICY IF EXISTS "Users can insert approval requests" ON public.approval_requests;
CREATE POLICY "Users can insert approval requests"
ON public.approval_requests
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_my_company_id());