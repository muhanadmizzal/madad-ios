
-- Drop the recursive SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view profiles in same company" ON public.profiles;

-- Create a non-recursive policy: users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Also allow users in the same company to view each other's profiles
-- using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "Users can view company profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (company_id = public.get_my_company_id());
