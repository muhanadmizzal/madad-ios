INSERT INTO public.user_roles (user_id, role)
VALUES ('b4965a66-c34d-40f3-901e-b065db2b9291', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;