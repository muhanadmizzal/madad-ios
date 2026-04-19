-- Allow employees to update their own record (phone, email, address)
CREATE POLICY "Employees can update own record"
ON public.employees
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());