
-- Admins can manage roles in their company
CREATE POLICY "Admins can manage company roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  user_id IN (
    SELECT p2.user_id FROM profiles p1
    JOIN profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.user_id = auth.uid()
  )
);
