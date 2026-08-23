-- El error 42501 en is_staff ocurre porque la función es SECURITY DEFINER pero hemos revocado execution a PUBLIC/anon.
-- Sin embargo, las políticas RLS se ejecutan con los privilegios del usuario que hace la consulta (anon).
-- Para usuarios anónimos, no necesitamos llamar a is_staff() porque por definición no son staff.

DROP POLICY IF EXISTS categories_read ON public.work_categories;

-- Política simplificada: 
-- 1. Si es activa, cualquiera la ve.
-- 2. Si no es activa, solo el staff (authenticated + is_staff) la ve.
CREATE POLICY categories_read ON public.work_categories 
FOR SELECT TO anon, authenticated 
USING (
  is_active = true 
  OR 
  (auth.role() = 'authenticated' AND public.is_staff(auth.uid()))
);

-- Aseguramos que el rol anon pueda ejecutar las funciones de chequeo necesarias si se requieren en políticas
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
-- Nota: anon NO necesita ejecutar is_staff porque la política arriba ahora usa cortocircuito (is_active = true)
