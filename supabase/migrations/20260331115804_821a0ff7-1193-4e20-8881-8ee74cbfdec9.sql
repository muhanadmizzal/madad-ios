-- Fix notifications RLS policies to support broadcast (user_id IS NULL) and proper company scoping

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- SELECT: user can see their own notifications OR broadcast notifications (user_id IS NULL) within their company
CREATE POLICY "Users can view notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND (user_id = auth.uid() OR user_id IS NULL)
);

-- UPDATE: user can mark their own notifications as read, OR broadcast notifications as read
CREATE POLICY "Users can update notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (
  company_id = get_my_company_id()
  AND (user_id = auth.uid() OR user_id IS NULL)
);

-- INSERT: HR/admin/managers can create notifications for their company
CREATE POLICY "Authorized users can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_my_company_id()
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);