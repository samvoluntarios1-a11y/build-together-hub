# Plan: Solución de Categorías en Formulario de Registro

El objetivo es corregir el error que impide que las categorías de trabajo aparezcan en el formulario público de registro de voluntarios.

## Problemas Identificados
- Las categorías no se muestran en el paso 2 del registro porque la política RLS (`categories_read`) y la consulta en el frontend podrían estar filtrando incorrectamente los datos para usuarios anónimos.
- Las categorías iniciales se insertaron con `is_active = true`, pero necesitamos asegurar que el rol `anon` tenga permisos explícitos de `GRANT` para realizar la lectura.

## Cambios a Realizar

### Backend (Base de Datos)
- Ejecutar una migración para asegurar que el rol `anon` tenga permisos de `SELECT` en la tabla `work_categories`.
- Verificar y reforzar la política RLS para permitir el acceso público a categorías activas.

### Frontend
- Ajustar la consulta en `src/routes/register.tsx` para simplificar la obtención de datos y asegurar que el cliente de Supabase maneje correctamente la petición anónima.

## Detalles Técnicos
- **SQL**: `GRANT SELECT ON public.work_categories TO anon;`
- **Frontend**: Revisar el `useQuery` en `src/routes/register.tsx` y la definición del tipo `WorkCategory`.

## Revisión y Pruebas
- Verificar visualmente en el paso "Habilidades" del formulario de registro que el selector de categorías cargue los 10 oficios predefinidos.
