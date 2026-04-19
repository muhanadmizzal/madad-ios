-- Allow super admins to INSERT and manage companies
CREATE POLICY "Super admins can manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));