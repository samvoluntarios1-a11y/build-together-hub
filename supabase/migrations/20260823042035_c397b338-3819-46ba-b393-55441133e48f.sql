-- Asegurar permisos de lectura para usuarios anónimos
GRANT SELECT ON public.work_categories TO anon;

-- Reforzar la política RLS para lectura pública
DROP POLICY IF EXISTS categories_read ON public.work_categories;
CREATE POLICY categories_read ON public.work_categories 
FOR SELECT TO anon, authenticated 
USING (is_active = true OR public.is_staff(auth.uid()));
