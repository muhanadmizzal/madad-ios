-- Fix provision_local_node: qualify pgcrypto functions with extensions schema
CREATE OR REPLACE FUNCTION public.provision_local_node(
  p_request_id uuid,
  p_node_name text,
  p_review_notes text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_company UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_node_id UUID;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super_admin can provision nodes';
  END IF;

  SELECT company_id INTO v_company
  FROM public.madad_local_access_requests
  WHERE id = p_request_id AND request_status = 'pending';
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  v_token := 'ltk_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token::bytea, 'sha256'), 'hex');

  INSERT INTO public.madad_local_nodes (
    company_id, request_id, node_name, node_status, activation_status,
    provisioning_token_hash, provisioning_token_expires_at, created_by
  )
  VALUES (
    v_company, p_request_id, p_node_name, 'provisioned', 'pending',
    v_token_hash, now() + interval '7 days', auth.uid()
  )
  RETURNING id INTO v_node_id;

  PERFORM public.refresh_local_node_entitlements(v_node_id);

  UPDATE public.madad_local_access_requests
  SET request_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes
  WHERE id = p_request_id;

  RETURN json_build_object(
    'node_id', v_node_id,
    'provisioning_token', v_token,
    'expires_at', (now() + interval '7 days')
  );
END;
$function$;

-- Fix refresh_local_node_entitlements: use real table madad_tenant_modules joined to madad_modules
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

  -- Modules: from madad_tenant_modules joined to madad_modules.slug
  INSERT INTO public.madad_local_node_modules (local_node_id, company_id, module_slug, status)
  SELECT DISTINCT p_node_id, v_company, mm.slug, 'active'
  FROM public.madad_tenant_modules tm
  JOIN public.madad_modules mm ON mm.id = tm.module_id
  WHERE tm.company_id = v_company
    AND COALESCE(tm.is_active, true) = true;
  GET DIAGNOSTICS v_modules = ROW_COUNT;

  -- Features: from tenant_features (active)
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