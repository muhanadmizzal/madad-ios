
-- 1. Add status column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 2. Subscription Plans
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  max_employees integer NOT NULL DEFAULT 5,
  max_storage_gb integer NOT NULL DEFAULT 1,
  max_branches integer NOT NULL DEFAULT 1,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 3. Tenant Subscriptions
CREATE TABLE public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage subscriptions" ON public.tenant_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view own subscription" ON public.tenant_subscriptions
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

-- 4. Billing Invoices
CREATE TABLE public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id),
  invoice_number text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  due_date date NOT NULL,
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage invoices" ON public.billing_invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view own invoices" ON public.billing_invoices
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

-- 5. Tenant Usage
CREATE TABLE public.tenant_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  employee_count integer NOT NULL DEFAULT 0,
  storage_used_mb numeric NOT NULL DEFAULT 0,
  api_calls integer NOT NULL DEFAULT 0,
  ai_requests integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, month, year)
);

ALTER TABLE public.tenant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage usage" ON public.tenant_usage
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view own usage" ON public.tenant_usage
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

-- 6. Support Tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  submitted_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can manage own tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id());

-- 7. AI Service Logs
CREATE TABLE public.ai_service_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  model text NOT NULL,
  feature text NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage ai logs" ON public.ai_service_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view own ai logs" ON public.ai_service_logs
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());
