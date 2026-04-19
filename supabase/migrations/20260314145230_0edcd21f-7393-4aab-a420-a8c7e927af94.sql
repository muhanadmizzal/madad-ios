
-- Stage history tracking for candidates
CREATE TABLE public.candidate_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stage history" ON public.candidate_stage_history
  FOR SELECT TO authenticated
  USING (candidate_id IN (
    SELECT id FROM public.candidates WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can insert stage history" ON public.candidate_stage_history
  FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (
    SELECT id FROM public.candidates WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  ));

-- Enable realtime for candidates table for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_stage_history;
