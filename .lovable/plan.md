# Plan: Restaurar Conexión Nativa de Supabase

El usuario ha conectado su proyecto de Supabase externo a través de la integración nativa de Lovable (Connectors → Supabase). La configuración manual previa (Secrets `VITE_SUPABASE_URL`, etc.) ya no es necesaria y debe ser revertida para usar las variables inyectadas automáticamente.

## Tareas

1.  **Revertir cambios manuales en el cliente de Supabase**:
    *   Restaurar `src/integrations/supabase/client.ts` a su estado original (generado automáticamente).
    *   Restaurar `src/integrations/supabase/auth-middleware.ts` a su estado original.
    *   Restaurar `src/integrations/supabase/client.server.ts` a su estado original.

2.  **Limpiar archivos de documentación obsoletos**:
    *   Eliminar `CONEXION_MANUAL_SUPABASE.md`.

3.  **Verificación de conexión**:
    *   Realizar una prueba de lectura de `work_categories` usando el cliente nativo.
    *   Realizar una prueba de lectura de `profiles` para confirmar RLS.

4.  **Limpiar Secrets (Instrucción para el usuario)**:
    *   Notificar al usuario que puede eliminar los Secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_ROLE_KEY` de la configuración de Lovable, ya que la integración nativa los provee automáticamente.

## Detalles Técnicos

*   La integración nativa de Lovable inyecta las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en el entorno.
*   El cliente generado en `src/integrations/supabase/client.ts` ya está diseñado para usar estas variables.
*   Se usará `supabaseAdmin` (service role) solo cuando sea estrictamente necesario en el servidor, siguiendo el patrón estándar de TanStack Start.
