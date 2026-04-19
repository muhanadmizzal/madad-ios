
CREATE TABLE public.agency_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage agency clients in their company"
ON public.agency_clients
FOR ALL
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
