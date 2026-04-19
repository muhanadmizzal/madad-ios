-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'business_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technical_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_officer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Add scope_type and tenant_id columns
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'tenant';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Update existing super_admin roles to platform scope
UPDATE public.user_roles SET scope_type = 'platform' WHERE role = 'super_admin';

-- Update existing tenant roles to include tenant_id from profiles
UPDATE public.user_roles ur
SET tenant_id = p.company_id
FROM public.profiles p
WHERE ur.user_id = p.user_id
AND ur.scope_type = 'tenant'
AND ur.tenant_id IS NULL
AND p.company_id IS NOT NULL;

-- Create helper function to get user portal
CREATE OR REPLACE FUNCTION public.get_user_portal(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role = 'super_admin'
    ) THEN 'business'
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role IN ('admin', 'hr_manager')
    ) THEN 'tenant'
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role = 'employee'
    ) THEN 'employee'
    ELSE 'unauthorized'
  END;
$$;