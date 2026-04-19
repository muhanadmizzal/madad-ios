CREATE OR REPLACE FUNCTION public.refresh_local_node_entitlements(p_node_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company UUID;
  v_modules INTEGER := 0;
  v_features INTEGER := 0;
BEGIN
  SELECT company_id INTO v_company FROM public.madad_local_nodes WHERE id = p_node_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Node not found';
  END IF;

  DELETE FROM public.madad_local_node_modules WHERE local_node_id = p_node_id;
  DELETE FROM public.madad_local_node_features WHERE local_node_id = p_node_id;

  INSERT INTO public.madad_local_node_modules (local_node_id, company_id, module_slug, status)
  SELECT DISTINCT p_node_id, v_company, mm.key, 'active'
  FROM public.madad_tenant_modules tm
  JOIN public.madad_modules mm ON mm.id = tm.module_id
  WHERE tm.company_id = v_company
    AND COALESCE(tm.is_active, true) = true;
  GET DIAGNOSTICS v_modules = ROW_COUNT;

  INSERT INTO public.madad_local_node_features (local_node_id, company_id, module_slug, feature_key, status)
  SELECT DISTINCT p_node_id, v_company, f.module_key, f.feature_key, 'active'
  FROM public.tenant_features f
  WHERE f.company_id = v_company
    AND f.status = 'active';
  GET DIAGNOSTICS v_features = ROW_COUNT;

  UPDATE public.madad_local_nodes
  SET updated_at = now(), last_sync_at = now()
  WHERE id = p_node_id;

  RETURN json_build_object('modules', v_modules, 'features', v_features);
END;
$function$;