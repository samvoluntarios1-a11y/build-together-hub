# Guía de Conexión Supabase Externo (Manual)

He adaptado el proyecto para que utilice tu propio proyecto de Supabase mediante variables de entorno estándar, eliminando la dependencia de Lovable Cloud para la conexión.

### Archivos Modificados
1.  **`src/integrations/supabase/client.ts`**: Actualizado para leer `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
2.  **`src/integrations/supabase/auth-middleware.ts`**: Configurado para usar las mismas variables en el lado del servidor.
3.  **`src/integrations/supabase/client.server.ts`**: Sincronizado con la URL de tu proyecto.
4.  **`src/start.ts`**: Activado el middleware de autenticación para que las sesiones funcionen correctamente con tu Supabase externo.

### Variables que debes cargar en Lovable (Settings > Secrets)
Debes agregar exactamente estos dos nombres:
*   `VITE_SUPABASE_URL`: La URL de tu proyecto (ej: `https://xyz.supabase.co`).
*   `VITE_SUPABASE_PUBLISHABLE_KEY`: Tu clave `anon` / `public`.

*(Opcional si usas funciones administrativas en el servidor)*:
*   `SUPABASE_SERVICE_ROLE_KEY`: Tu clave de servicio (solo necesaria si el código del servidor requiere saltar RLS).

### Checklist de Verificación
1.  [ ] **Variables**: ¿Están cargadas en los Secrets de Lovable? (Reinicia el preview si las acabas de agregar).
2.  [ ] **Registro**: Ve a `/register` y verifica que carguen las categorías de tu base de datos.
3.  [ ] **Login**: Intenta iniciar sesión con un usuario que ya exista en tu proyecto de Supabase.
4.  [ ] **Dashboard**: Una vez logueado, verifica que veas los datos de tu tabla `profiles`.
