
CREATE OR REPLACE FUNCTION public.generate_api_key(p_company_id uuid, p_name text DEFAULT 'Default'::text, p_scopes text[] DEFAULT ARRAY['v1:read'::text])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_raw_key TEXT;
  v_hash TEXT;
  v_prefix TEXT;
  v_id UUID;
BEGIN
  IF p_company_id != get_my_company_id() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  v_raw_key := 'tmk_' || encode(gen_random_bytes(32), 'hex');
  v_prefix := substring(v_raw_key from 1 for 12);
  v_hash := encode(digest(v_raw_key::bytea, 'sha256'), 'hex');
  
  INSERT INTO api_keys (company_id, name, key_hash, key_prefix, scopes, created_by)
  VALUES (p_company_id, p_name, v_hash, v_prefix, p_scopes, auth.uid())
  RETURNING id INTO v_id;
  
  RETURN json_build_object('id', v_id, 'key', v_raw_key, 'prefix', v_prefix);
END;
$function$;
