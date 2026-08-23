-- La política actual falla porque 'anon' intenta evaluar 'is_staff' aunque la primera parte sea true
-- (Postgres no siempre garantiza el cortocircuito en RLS si hay funciones involucradas)

DROP POLICY IF EXISTS categories_read ON public.work_categories;

-- Creamos DOS políticas separadas para evitar conflictos de evaluación
CREATE POLICY categories_read_public ON public.work_categories 
FOR SELECT TO anon, authenticated 
USING (is_active = true);

CREATE POLICY categories_read_staff ON public.work_categories 
FOR SELECT TO authenticated 
USING (public.is_staff(auth.uid()));
