
-- Business audit logs for platform-side actions
CREATE TABLE public.business_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  tenant_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business admins can view audit" ON public.business_audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Business admins can insert audit" ON public.business_audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Business support notes for internal tenant notes
CREATE TABLE public.business_support_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  author_user_id uuid NOT NULL,
  note_type text NOT NULL DEFAULT 'general',
  note_text text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_support_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business admins can manage notes" ON public.business_support_notes FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Add yearly_price to ai_packages
ALTER TABLE public.ai_packages ADD COLUMN IF NOT EXISTS yearly_price numeric NOT NULL DEFAULT 0;

-- Add category to ai_packages for multi-type support
ALTER TABLE public.ai_packages ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ai';

-- Tenant add-ons
CREATE TABLE public.tenant_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  addon_package_id uuid REFERENCES public.ai_packages(id) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  custom_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view own addons" ON public.tenant_addons FOR SELECT TO authenticated USING (company_id = get_my_company_id());
CREATE POLICY "Super admins manage addons" ON public.tenant_addons FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Enhance tenant_subscriptions with AI package reference and custom pricing
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS ai_package_id uuid REFERENCES public.ai_packages(id);
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS custom_monthly_price numeric;
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS custom_yearly_price numeric;
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS created_by uuid;

-- Update yearly prices for existing AI packages
UPDATE public.ai_packages SET yearly_price = monthly_price * 10 WHERE yearly_price = 0 AND monthly_price > 0;
