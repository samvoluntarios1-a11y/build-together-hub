-- Cambiar a SECURITY INVOKER para que se ejecute con los permisos del usuario actual
-- Esto evita el error 42501 cuando un usuario anónimo dispara la política RLS
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','coordinator'))
$$;

-- También has_role por consistencia
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Aseguramos que authenticated pueda leer user_roles para que estas funciones trabajen
GRANT SELECT ON public.user_roles TO authenticated;
-- El rol anon NO tiene acceso a user_roles, por lo que las funciones devolverán false (como debe ser)
