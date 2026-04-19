
-- Exit surveys table for structured exit interview data
CREATE TABLE public.exit_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  exit_clearance_id UUID NOT NULL REFERENCES public.exit_clearance(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  
  -- Survey responses (1-5 scale)
  satisfaction_overall INTEGER CHECK (satisfaction_overall BETWEEN 1 AND 5),
  satisfaction_management INTEGER CHECK (satisfaction_management BETWEEN 1 AND 5),
  satisfaction_compensation INTEGER CHECK (satisfaction_compensation BETWEEN 1 AND 5),
  satisfaction_growth INTEGER CHECK (satisfaction_growth BETWEEN 1 AND 5),
  satisfaction_culture INTEGER CHECK (satisfaction_culture BETWEEN 1 AND 5),
  satisfaction_worklife INTEGER CHECK (satisfaction_worklife BETWEEN 1 AND 5),
  
  -- Reason categories
  primary_reason TEXT NOT NULL DEFAULT 'other',
  secondary_reasons TEXT[] DEFAULT '{}',
  
  -- Free-form
  what_liked TEXT,
  what_improved TEXT,
  would_recommend BOOLEAN,
  would_return BOOLEAN,
  additional_comments TEXT,
  
  -- Interview details
  interviewer_name TEXT,
  interview_date DATE DEFAULT CURRENT_DATE,
  interview_conducted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(exit_clearance_id)
);

-- Add hiring_source column to recruitment_jobs for internal/external tracking
ALTER TABLE public.recruitment_jobs ADD COLUMN IF NOT EXISTS hiring_source TEXT DEFAULT 'external';

-- RLS
ALTER TABLE public.exit_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exit surveys in their company"
  ON public.exit_surveys FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Users can insert exit surveys in their company"
  ON public.exit_surveys FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Users can update exit surveys in their company"
  ON public.exit_surveys FOR UPDATE TO authenticated
  USING (company_id = public.get_my_company_id());
