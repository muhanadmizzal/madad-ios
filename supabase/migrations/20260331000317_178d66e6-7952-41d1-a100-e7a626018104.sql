-- Fix attendance_records INSERT policy to use get_my_company_id() instead of profiles subquery
DROP POLICY IF EXISTS "Users can insert attendance" ON public.attendance_records;

CREATE POLICY "Users can insert attendance"
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_my_company_id()
  AND employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);