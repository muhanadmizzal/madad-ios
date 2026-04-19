
-- Fix handle_new_user to set tenant_id on user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO public.companies (name, email, phone, sector, employee_count_range)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'شركتي'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'sector', 'private'),
    COALESCE(NEW.raw_user_meta_data->>'employee_count_range', NULL)
  )
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (user_id, company_id, full_name)
  VALUES (NEW.id, new_company_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role, scope_type, tenant_id)
  VALUES (NEW.id, 'admin', 'tenant', new_company_id);

  PERFORM public.create_default_leave_types(new_company_id);

  RETURN NEW;
END;
$function$;

-- Fix existing user_roles that have NULL tenant_id
UPDATE public.user_roles ur
SET tenant_id = p.company_id
FROM public.profiles p
WHERE ur.user_id = p.user_id
  AND ur.tenant_id IS NULL
  AND ur.scope_type = 'tenant'
  AND p.company_id IS NOT NULL;
