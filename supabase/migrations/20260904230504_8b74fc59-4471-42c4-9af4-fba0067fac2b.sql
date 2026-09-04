REVOKE ALL ON FUNCTION public.deactivate_expired_flexible_availability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_availability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_assignments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_expired_flexible_availability() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_availability() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_assignments() TO service_role;