GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_skills TO authenticated;
GRANT ALL ON public.volunteer_skills TO service_role;

GRANT SELECT, INSERT, DELETE ON public.availability TO authenticated;
GRANT ALL ON public.availability TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flexible_availability TO authenticated;
GRANT ALL ON public.flexible_availability TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accommodation_requests TO authenticated;
GRANT ALL ON public.accommodation_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_assignments TO authenticated;
GRANT ALL ON public.calendar_assignments TO service_role;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_categories TO authenticated;
GRANT SELECT ON public.work_categories TO anon;
GRANT ALL ON public.work_categories TO service_role;

NOTIFY pgrst, 'reload schema';