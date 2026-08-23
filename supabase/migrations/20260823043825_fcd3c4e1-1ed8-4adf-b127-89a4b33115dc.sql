
-- 1. Asegurar que las funciones de seguridad sean robustas y accesibles
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role IN ('admin', 'coordinator')
  )
$$;

-- 2. Asegurar permisos de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO service_role;

-- 3. Corregir RLS en user_roles para permitir que el usuario lea su propio rol durante el login
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Asegurar que el usuario tenga el rol de administrador (por si acaso hubo algún fallo previo)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email IN ('samvoluntarios1@gmail.com', 'samvoluntarios1@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
