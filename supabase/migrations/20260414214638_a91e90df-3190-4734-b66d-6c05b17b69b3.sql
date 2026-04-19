
-- Payment methods configuration (Super Admin manages)
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled payment methods"
  ON public.payment_methods FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage payment methods"
  ON public.payment_methods FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed default payment methods
INSERT INTO public.payment_methods (key, name_ar, name_en, sort_order, config) VALUES
  ('cash', 'نقدي', 'Cash', 1, '{"instructions": ""}'),
  ('zain_cash', 'زين كاش', 'Zain Cash', 2, '{"phone": "", "instructions": ""}'),
  ('bank_card', 'بطاقة مصرفية', 'Bank Card', 3, '{"gateway": "", "api_key": ""}');

-- Activation requests (tenant → super admin approval flow)
CREATE TABLE public.activation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'activation',
  module_keys TEXT[] NOT NULL DEFAULT '{}',
  feature_keys TEXT[] NOT NULL DEFAULT '{}',
  package_id UUID REFERENCES public.madad_packages(id),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method_key TEXT,
  payment_proof TEXT,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own activation requests"
  ON public.activation_requests FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can create activation requests"
  ON public.activation_requests FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can manage all activation requests"
  ON public.activation_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activation_requests_updated_at
  BEFORE UPDATE ON public.activation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
