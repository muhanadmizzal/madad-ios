
-- ============================================================
-- 1. DROP the broad client-side INSERT policy on user_roles
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

-- ============================================================
-- 2. DROP the broad ALL policy that lets any admin manage roles
--    (it allows cross-tenant and self-promotion)
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage company roles" ON public.user_roles;

-- ============================================================
-- 3. Keep SELECT: users can always read their own roles
-- ============================================================
-- (already exists: "Users can view own roles" with USING user_id = auth.uid())

-- ============================================================
-- 4. Add SELECT for admins to see roles within their tenant
-- ============================================================
CREATE POLICY "Admins can view tenant roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = get_my_company_id()
);

-- ============================================================
-- 5. No direct INSERT/UPDATE/DELETE for any authenticated user
--    All writes go through SECURITY DEFINER functions below
-- ============================================================

-- ============================================================
-- 6. Validation trigger: enforce scope_type/tenant_id correctness
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  platform_roles text[] := ARRAY['super_admin','business_admin','finance_manager','support_agent','sales_manager','technical_admin'];
  tenant_roles text[] := ARRAY['tenant_admin','admin','hr_manager','hr_officer','manager','employee'];
BEGIN
  -- Platform roles must have scope_type=platform and tenant_id=NULL
  IF NEW.role::text = ANY(platform_roles) THEN
    IF NEW.scope_type != 'platform' OR NEW.tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'Platform roles must have scope_type=platform and tenant_id=NULL';
    END IF;
  END IF;

  -- Tenant roles must have scope_type=tenant and a valid tenant_id
  IF NEW.role::text = ANY(tenant_roles) THEN
    IF NEW.scope_type != 'tenant' OR NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Tenant roles must have scope_type=tenant and a valid tenant_id';
    END IF;
    -- Verify tenant_id references a real company
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.tenant_id) THEN
      RAISE EXCEPTION 'tenant_id does not reference a valid company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_user_role
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_role();

-- ============================================================
-- 7. Audit trigger: log every role change
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_action text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  -- Determine company context
  v_company_id := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END,
    get_my_company_id()
  );

  IF TG_OP = 'INSERT' THEN
    v_action := 'role_assigned';
    v_old := NULL;
    v_new := jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role::text, 'scope_type', NEW.scope_type, 'tenant_id', NEW.tenant_id);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'role_updated';
    v_old := jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role::text, 'scope_type', OLD.scope_type, 'tenant_id', OLD.tenant_id);
    v_new := jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role::text, 'scope_type', NEW.scope_type, 'tenant_id', NEW.tenant_id);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'role_removed';
    v_old := jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role::text, 'scope_type', OLD.scope_type, 'tenant_id', OLD.tenant_id);
    v_new := NULL;
  END IF;

  -- Use a fallback company_id for platform-level changes
  IF v_company_id IS NULL THEN
    v_company_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Only insert if company exists (skip for platform sentinel)
  BEGIN
    INSERT INTO public.audit_logs (company_id, user_id, table_name, action, record_id, old_values, new_values)
    VALUES (
      v_company_id,
      auth.uid(),
      'user_roles',
      v_action,
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      v_old,
      v_new
    );
  EXCEPTION WHEN foreign_key_violation THEN
    -- Platform-level role changes where no company context exists: skip audit
    NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_change();

-- ============================================================
-- 8. Secure RPC: recover_own_role — replaces client-side recovery
--    Only inserts 'admin' if user has profile+company but zero roles
-- ============================================================
CREATE OR REPLACE FUNCTION public.recover_own_role()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_existing int;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has roles
  SELECT count(*) INTO v_existing FROM public.user_roles WHERE user_id = v_user_id;
  IF v_existing > 0 THEN
    SELECT jsonb_agg(jsonb_build_object('role', role::text, 'scope_type', scope_type, 'tenant_id', tenant_id))
    INTO v_result
    FROM public.user_roles WHERE user_id = v_user_id;
    RETURN v_result;
  END IF;

  -- Get company from profile
  SELECT company_id INTO v_company_id FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_company_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Insert default admin role
  INSERT INTO public.user_roles (user_id, role, scope_type, tenant_id)
  VALUES (v_user_id, 'admin', 'tenant', v_company_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT jsonb_agg(jsonb_build_object('role', role::text, 'scope_type', scope_type, 'tenant_id', tenant_id))
  INTO v_result
  FROM public.user_roles WHERE user_id = v_user_id;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- 9. Secure RPC: assign_tenant_role — for tenant admins
--    Enforces same-tenant, prevents platform role assignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_tenant_role(
  p_target_user_id uuid,
  p_role app_role,
  p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_company uuid;
  platform_roles text[] := ARRAY['super_admin','business_admin','finance_manager','support_agent','sales_manager','technical_admin'];
  allowed_tenant_roles text[] := ARRAY['tenant_admin','admin','hr_manager','hr_officer','manager','employee'];
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Caller must be admin or tenant_admin
  IF NOT (has_role(v_caller_id, 'admin'::app_role) OR has_role(v_caller_id, 'tenant_admin'::app_role) OR has_role(v_caller_id, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Cannot assign platform roles through this function
  IF p_role::text = ANY(platform_roles) THEN
    RAISE EXCEPTION 'Cannot assign platform roles through tenant assignment';
  END IF;

  -- Must be a valid tenant role
  IF NOT (p_role::text = ANY(allowed_tenant_roles)) THEN
    RAISE EXCEPTION 'Invalid role for tenant assignment';
  END IF;

  -- Non-super_admin callers: enforce same-tenant
  IF NOT has_role(v_caller_id, 'super_admin'::app_role) THEN
    SELECT company_id INTO v_caller_company FROM public.profiles WHERE user_id = v_caller_id LIMIT 1;
    IF v_caller_company IS NULL OR v_caller_company != p_tenant_id THEN
      RAISE EXCEPTION 'Cannot assign roles outside your own tenant';
    END IF;
  END IF;

  -- Target user must belong to the same tenant
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id AND company_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Target user does not belong to the specified tenant';
  END IF;

  -- Cannot self-promote to tenant_admin unless caller is super_admin
  IF p_target_user_id = v_caller_id AND p_role = 'tenant_admin'::app_role AND NOT has_role(v_caller_id, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Cannot self-promote to tenant_admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role, scope_type, tenant_id)
  VALUES (p_target_user_id, p_role, 'tenant', p_tenant_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- ============================================================
-- 10. Secure RPC: assign_platform_role — super_admin only
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_platform_role(
  p_target_user_id uuid,
  p_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  platform_roles text[] := ARRAY['super_admin','business_admin','finance_manager','support_agent','sales_manager','technical_admin'];
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only super_admin can assign platform roles
  IF NOT has_role(v_caller_id, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super_admin can assign platform roles';
  END IF;

  IF NOT (p_role::text = ANY(platform_roles)) THEN
    RAISE EXCEPTION 'Not a valid platform role';
  END IF;

  INSERT INTO public.user_roles (user_id, role, scope_type, tenant_id)
  VALUES (p_target_user_id, p_role, 'platform', NULL)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- ============================================================
-- 11. Secure RPC: remove_role — admin/super_admin only
-- ============================================================
CREATE OR REPLACE FUNCTION public.remove_user_role(
  p_target_user_id uuid,
  p_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_company uuid;
  v_target_tenant uuid;
  platform_roles text[] := ARRAY['super_admin','business_admin','finance_manager','support_agent','sales_manager','technical_admin'];
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Cannot remove own super_admin
  IF p_target_user_id = v_caller_id AND p_role = 'super_admin'::app_role THEN
    RAISE EXCEPTION 'Cannot remove your own super_admin role';
  END IF;

  -- Platform role removal: super_admin only
  IF p_role::text = ANY(platform_roles) THEN
    IF NOT has_role(v_caller_id, 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Only super_admin can remove platform roles';
    END IF;
  ELSE
    -- Tenant role removal: must be admin in same tenant
    SELECT tenant_id INTO v_target_tenant FROM public.user_roles 
    WHERE user_id = p_target_user_id AND role = p_role LIMIT 1;

    IF NOT has_role(v_caller_id, 'super_admin'::app_role) THEN
      SELECT company_id INTO v_caller_company FROM public.profiles WHERE user_id = v_caller_id LIMIT 1;
      IF v_caller_company IS NULL OR v_caller_company != v_target_tenant THEN
        RAISE EXCEPTION 'Cannot remove roles outside your own tenant';
      END IF;
      IF NOT (has_role(v_caller_id, 'admin'::app_role) OR has_role(v_caller_id, 'tenant_admin'::app_role)) THEN
        RAISE EXCEPTION 'Insufficient privileges to remove roles';
      END IF;
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_target_user_id AND role = p_role;
END;
$$;
