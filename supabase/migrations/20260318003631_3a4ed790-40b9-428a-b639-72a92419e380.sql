
CREATE OR REPLACE FUNCTION public.get_my_visible_workflow_instances(
  p_status text DEFAULT NULL,
  p_request_type text DEFAULT NULL
)
RETURNS SETOF workflow_instances
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_is_admin boolean;
  v_is_hr boolean;
  v_is_manager boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  v_is_admin := has_role(v_user_id, 'admin') OR has_role(v_user_id, 'tenant_admin');
  v_is_hr := has_role(v_user_id, 'hr_manager') OR has_role(v_user_id, 'hr_officer');
  v_is_manager := has_role(v_user_id, 'manager');

  RETURN QUERY
  SELECT wi.*
  FROM workflow_instances wi
  WHERE wi.company_id = v_company_id
    AND (p_status IS NULL OR p_status = 'all' OR wi.status = p_status)
    AND (p_request_type IS NULL OR p_request_type = 'all' OR wi.request_type = p_request_type)
    AND (
      v_is_admin OR v_is_hr
      OR wi.requester_user_id = v_user_id
      OR (v_is_manager AND wi.requester_user_id IN (
        SELECT e.user_id FROM employees e WHERE e.manager_user_id = v_user_id AND e.company_id = v_company_id
      ))
    )
  ORDER BY wi.created_at DESC;
END;
$$;
