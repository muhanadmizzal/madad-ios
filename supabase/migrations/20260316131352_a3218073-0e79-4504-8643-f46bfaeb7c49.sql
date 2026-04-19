
-- ============================================================
-- 1. Fix resume storage bucket policies (tenant isolation)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read resumes" ON storage.objects;

-- Tenant users can read resumes scoped to their company folder
CREATE POLICY "Tenant users can read resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT p.company_id::text FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- HR can upload resumes to their company folder
CREATE POLICY "HR can upload resumes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT p.company_id::text FROM profiles p WHERE p.user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
  )
);

-- HR can delete resumes in their company folder
CREATE POLICY "HR can delete resumes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT p.company_id::text FROM profiles p WHERE p.user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'hr_officer'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
  )
);

-- ============================================================
-- 2. Expand recruitment write policies to include manager & tenant_admin
-- ============================================================

-- CANDIDATES
DROP POLICY IF EXISTS "HR can insert candidates" ON candidates;
DROP POLICY IF EXISTS "HR can update candidates" ON candidates;
DROP POLICY IF EXISTS "HR can delete candidates" ON candidates;

CREATE POLICY "Hiring team can insert candidates" ON candidates
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Hiring team can update candidates" ON candidates
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Hiring team can delete candidates" ON candidates
FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- RECRUITMENT_JOBS
DROP POLICY IF EXISTS "HR can insert jobs" ON recruitment_jobs;
DROP POLICY IF EXISTS "HR can update jobs" ON recruitment_jobs;
DROP POLICY IF EXISTS "HR can delete jobs" ON recruitment_jobs;

CREATE POLICY "Hiring team can insert jobs" ON recruitment_jobs
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Hiring team can update jobs" ON recruitment_jobs
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Hiring team can delete jobs" ON recruitment_jobs
FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- INTERVIEW_SCHEDULES
DROP POLICY IF EXISTS "HR can insert interview schedules" ON interview_schedules;
DROP POLICY IF EXISTS "HR can update interview schedules" ON interview_schedules;
DROP POLICY IF EXISTS "HR can delete interview schedules" ON interview_schedules;

CREATE POLICY "Hiring team can insert interviews" ON interview_schedules
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Hiring team can update interviews" ON interview_schedules
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Hiring team can delete interviews" ON interview_schedules
FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- OFFER_LETTERS
DROP POLICY IF EXISTS "HR can insert offers" ON offer_letters;
DROP POLICY IF EXISTS "HR can update offers" ON offer_letters;
DROP POLICY IF EXISTS "HR can delete offers" ON offer_letters;

CREATE POLICY "Hiring team can insert offers" ON offer_letters
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "Hiring team can update offers" ON offer_letters
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "Hiring team can delete offers" ON offer_letters
FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- BACKGROUND_CHECKS
DROP POLICY IF EXISTS "HR can insert bg checks" ON background_checks;
DROP POLICY IF EXISTS "HR can update bg checks" ON background_checks;
DROP POLICY IF EXISTS "HR can delete bg checks" ON background_checks;

CREATE POLICY "Hiring team can insert bg checks" ON background_checks
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "Hiring team can update bg checks" ON background_checks
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

CREATE POLICY "Hiring team can delete bg checks" ON background_checks
FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role))
);

-- CANDIDATE_STAGE_HISTORY: add role check
DROP POLICY IF EXISTS "Admins can insert stage history" ON candidate_stage_history;

CREATE POLICY "Hiring team can insert stage history" ON candidate_stage_history
FOR INSERT TO authenticated
WITH CHECK (
  candidate_id IN (
    SELECT id FROM candidates WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'hr_officer'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);
