
CREATE TABLE public.onboarding_tour_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  completed_modules text[] NOT NULL DEFAULT '{}',
  current_module int NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.onboarding_tour_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tour progress"
ON public.onboarding_tour_progress
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
