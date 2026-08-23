-- Revocar permisos de ejecución pública por defecto para todas las funciones en el esquema public
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Revocar ejecución explícita de funciones sensibles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_availability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_assignments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit() FROM PUBLIC, anon, authenticated;

-- Permitir ejecución solo a roles necesarios (has_role e is_staff son internas para RLS, pero por si acaso las protegemos)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO service_role;

-- La única función que REALMENTE necesita ser pública para el formulario de registro
GRANT EXECUTE ON FUNCTION public.check_volunteer_number_available(text) TO anon, authenticated, service_role;
