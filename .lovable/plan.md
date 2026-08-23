# Plan para corregir el error 401 en el registro público

El usuario reporta un error 401 (Unauthorized) al intentar registrarse desde `/register`. Esto ocurre porque el formulario realiza múltiples `INSERT` directos a la base de datos a través de PostgREST, y el backend actual (Supabase propio) está configurado con RLS. Aunque existen políticas para `anon`, el flujo es frágil y propenso a errores de sesión/transacción. La solución definitiva es centralizar todo el registro en una única función de servidor segura.

## Acciones inmediatas
- Implementar una función de servidor (`createServerFn`) para el registro completo.
- Mover la lógica de validación y transacción al lado del servidor.
- Actualizar el frontend para usar esta nueva función.
- Asegurar que la función sea accesible públicamente sin requerir una sesión de Supabase Auth.

## Detalles técnicos
- **Función de servidor**: Se creará en `src/lib/registration.functions.ts`.
- **Transacción SQL**: La función utilizará el cliente `supabaseAdmin` (bypass RLS) para garantizar que el registro sea atómico (todo o nada).
- **Validaciones**: Se implementarán validaciones estrictas (Zod) para el número de voluntario, habilidades (máx. 3), categorías activas y fechas.
- **Transición**: Se eliminarán los `INSERT` directos desde el cliente a las tablas `profiles`, `volunteer_skills`, `availability` y `accommodation_requests`.

## Pasos

1. **Crear la función de servidor**:
   - Archivo: `src/lib/registration.functions.ts`.
   - Utilizar `createServerFn`.
   - No usar `.middleware([requireSupabaseAuth])` para permitir acceso público.
   - Validar entrada con Zod.
   - Usar `supabaseAdmin` para los inserts en una transacción o secuencia controlada.

2. **Actualizar el frontend en `src/routes/register.tsx`**:
   - Reemplazar la función `submit()` actual.
   - Llamar a la nueva función de servidor.
   - Mantener el manejo de errores y estados de carga.
   - Asegurar que el mensaje de error sea descriptivo si algo falla en el servidor.

3. **Verificación**:
   - Probar el registro en una ventana de incógnito.
   - Confirmar que los datos se guardan correctamente en todas las tablas.
   - Validar que no hay fugas de información.
