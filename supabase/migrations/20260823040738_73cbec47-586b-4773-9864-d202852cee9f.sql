INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'samvoluntarios1@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'samvoluntarios1@gmail.com'
AND email_confirmed_at IS NULL;