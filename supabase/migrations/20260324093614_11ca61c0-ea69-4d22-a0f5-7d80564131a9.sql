
DELETE FROM public.user_roles
WHERE user_id = 'b4965a66-c34d-40f3-901e-b065db2b9291'
  AND NOT (role = 'tenant_admin' AND tenant_id = 'bb7658d5-6b69-4479-bf01-92261761d347');
