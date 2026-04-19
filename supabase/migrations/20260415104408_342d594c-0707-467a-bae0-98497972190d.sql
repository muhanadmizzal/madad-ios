UPDATE auth.users 
SET email_confirmed_at = now(), 
    updated_at = now()
WHERE email = 'mmha2@cam.ac.uk' AND email_confirmed_at IS NULL;