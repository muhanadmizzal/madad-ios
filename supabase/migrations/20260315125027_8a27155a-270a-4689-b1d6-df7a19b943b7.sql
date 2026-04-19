
-- Allow users to insert their own role (for fallback recovery)
-- Only if they don't already have any roles (handled in app logic)
CREATE POLICY "Users can insert own roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
