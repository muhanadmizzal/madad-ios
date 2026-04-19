-- Fix: Add tenant_admin to employee UPDATE policy so tenant admins can assign employees to positions
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
CREATE POLICY "Admins can update employees" ON public.employees
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  )
)
WITH CHECK (
  company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  )
);