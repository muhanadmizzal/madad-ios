
-- Fix recruitment RLS policies: Replace ALL with separate policies that have proper WITH CHECK

-- ============ CANDIDATES ============
DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;

CREATE POLICY "HR can insert candidates"
ON public.candidates FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can update candidates"
ON public.candidates FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can delete candidates"
ON public.candidates FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- ============ RECRUITMENT_JOBS ============
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.recruitment_jobs;

CREATE POLICY "HR can insert jobs"
ON public.recruitment_jobs FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can update jobs"
ON public.recruitment_jobs FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can delete jobs"
ON public.recruitment_jobs FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- ============ INTERVIEW_SCHEDULES ============
DROP POLICY IF EXISTS "Admins can manage interview schedules" ON public.interview_schedules;

CREATE POLICY "HR can insert interview schedules"
ON public.interview_schedules FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can update interview schedules"
ON public.interview_schedules FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can delete interview schedules"
ON public.interview_schedules FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- ============ OFFER_LETTERS ============
DROP POLICY IF EXISTS "Admins can manage offers" ON public.offer_letters;

CREATE POLICY "HR can insert offers"
ON public.offer_letters FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can update offers"
ON public.offer_letters FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can delete offers"
ON public.offer_letters FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- ============ BACKGROUND_CHECKS ============
DROP POLICY IF EXISTS "Admins can manage bg checks" ON public.background_checks;

CREATE POLICY "HR can insert bg checks"
ON public.background_checks FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can update bg checks"
ON public.background_checks FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "HR can delete bg checks"
ON public.background_checks FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);
