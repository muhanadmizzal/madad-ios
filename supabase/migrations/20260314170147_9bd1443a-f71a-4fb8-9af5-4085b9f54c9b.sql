-- Interview schedules
CREATE TABLE public.interview_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.recruitment_jobs(id),
  interview_type text NOT NULL DEFAULT 'in_person',
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,
  interviewer_names text[],
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Interview scorecards
CREATE TABLE public.interview_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  interview_id uuid REFERENCES public.interview_schedules(id) ON DELETE SET NULL,
  interviewer_name text NOT NULL,
  technical_score integer CHECK (technical_score BETWEEN 1 AND 5),
  communication_score integer CHECK (communication_score BETWEEN 1 AND 5),
  cultural_fit_score integer CHECK (cultural_fit_score BETWEEN 1 AND 5),
  experience_score integer CHECK (experience_score BETWEEN 1 AND 5),
  overall_score integer CHECK (overall_score BETWEEN 1 AND 5),
  strengths text,
  weaknesses text,
  recommendation text DEFAULT 'neutral',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Offer letters
CREATE TABLE public.offer_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.recruitment_jobs(id),
  offered_salary numeric NOT NULL DEFAULT 0,
  offered_position text,
  start_date date,
  benefits text,
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid,
  approved_at timestamp with time zone,
  sent_at timestamp with time zone,
  response text,
  response_at timestamp with time zone,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Background checks
CREATE TABLE public.background_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  check_type text NOT NULL DEFAULT 'identity',
  status text NOT NULL DEFAULT 'pending',
  result text,
  verified_by text,
  verified_at timestamp with time zone,
  document_path text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add salary_range columns to recruitment_jobs
ALTER TABLE public.recruitment_jobs 
  ADD COLUMN IF NOT EXISTS salary_min numeric,
  ADD COLUMN IF NOT EXISTS salary_max numeric,
  ADD COLUMN IF NOT EXISTS budget_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requisition_notes text,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- RLS for all new tables
ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_checks ENABLE ROW LEVEL SECURITY;

-- interview_schedules policies
CREATE POLICY "Admins can manage interview schedules"
ON public.interview_schedules FOR ALL TO authenticated
USING ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

CREATE POLICY "Users can view interview schedules"
ON public.interview_schedules FOR SELECT TO authenticated
USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()));

-- interview_scorecards policies
CREATE POLICY "Admins can manage scorecards"
ON public.interview_scorecards FOR ALL TO authenticated
USING ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

CREATE POLICY "Users can view scorecards"
ON public.interview_scorecards FOR SELECT TO authenticated
USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()));

-- offer_letters policies
CREATE POLICY "Admins can manage offers"
ON public.offer_letters FOR ALL TO authenticated
USING ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

CREATE POLICY "Users can view offers"
ON public.offer_letters FOR SELECT TO authenticated
USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()));

-- background_checks policies
CREATE POLICY "Admins can manage bg checks"
ON public.background_checks FOR ALL TO authenticated
USING ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

CREATE POLICY "Users can view bg checks"
ON public.background_checks FOR SELECT TO authenticated
USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()));