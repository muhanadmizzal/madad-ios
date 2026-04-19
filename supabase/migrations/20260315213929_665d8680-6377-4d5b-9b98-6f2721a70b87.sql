
-- Fix workflow_instances SELECT policy: add tenant_admin, hr_officer
DROP POLICY IF EXISTS "Users can view own workflow instances" ON public.workflow_instances;
CREATE POLICY "Users can view own workflow instances" ON public.workflow_instances
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    requester_user_id = auth.uid()
    OR current_approver_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Fix workflow_instances UPDATE policy: add tenant_admin, hr_officer
DROP POLICY IF EXISTS "Admins can update workflow instances" ON public.workflow_instances;
CREATE POLICY "Admins can update workflow instances" ON public.workflow_instances
FOR UPDATE TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    current_approver_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Fix workflow_instances INSERT policy: allow any authenticated user in the company
DROP POLICY IF EXISTS "Users can insert own workflow instances" ON public.workflow_instances;
CREATE POLICY "Users can insert own workflow instances" ON public.workflow_instances
FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_my_company_id()
  AND requester_user_id = auth.uid()
);

-- Fix approval_actions INSERT policy: allow any authenticated user in the company (for submit actions)
DROP POLICY IF EXISTS "System can insert approval actions" ON public.approval_actions;
CREATE POLICY "System can insert approval actions" ON public.approval_actions
FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_my_company_id()
  AND actor_user_id = auth.uid()
);

-- Fix approval_actions SELECT policy: add tenant_admin, hr_officer, manager
DROP POLICY IF EXISTS "Users can view approval actions" ON public.approval_actions;
CREATE POLICY "Users can view approval actions" ON public.approval_actions
FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
);

-- Fix notifications INSERT policy to be more permissive for system inserts
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);
