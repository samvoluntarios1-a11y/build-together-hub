CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_availability() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_assignments() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_audit() FROM anon, authenticated, public;

-- La única función pública intencional: verifica disponibilidad del número de voluntario
REVOKE ALL ON FUNCTION public.check_volunteer_number_available(text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_volunteer_number_available(text) TO anon, authenticated;