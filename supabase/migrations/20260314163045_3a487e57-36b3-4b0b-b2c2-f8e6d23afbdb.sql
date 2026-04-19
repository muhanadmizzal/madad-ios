
-- Fix: drop duplicate and recreate
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.training_enrollments;
DROP POLICY IF EXISTS "Users can view enrollments" ON public.training_enrollments;

CREATE POLICY "Admins can manage enrollments v2" ON public.training_enrollments
  FOR ALL TO authenticated
  USING (course_id IN (SELECT id FROM training_courses WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')));

CREATE POLICY "Users can view enrollments v2" ON public.training_enrollments
  FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM training_courses WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
