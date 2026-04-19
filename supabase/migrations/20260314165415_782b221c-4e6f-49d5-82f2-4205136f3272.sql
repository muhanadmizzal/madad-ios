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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  PERFORM public.create_default_leave_types(new_company_id);

  RETURN NEW;
END;
$function$;