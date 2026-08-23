# Plan de Actualización de MIGRACION_SUPABASE.md

Este plan detalla las adiciones necesarias al archivo de migración para incluir las funciones de limpieza programada y las políticas RLS completas solicitadas.

## Cambios Técnicos

### 1. Funciones de Limpieza (Sección 5)
Se implementarán `cleanup_old_availability()` y `cleanup_old_assignments()` con las siguientes características:
- **`cleanup_old_availability()`**: Borra registros de `availability` con `available_date < CURRENT_DATE - INTERVAL '7 days'`.
- **`cleanup_old_assignments()`**: Borra registros de `calendar_assignments` con `assignment_date < CURRENT_DATE - INTERVAL '30 days'`, excluyendo los estados `confirmed` o `completed`.
- Ambas serán `SECURITY DEFINER` y registrarán el conteo de borrados en `audit_logs`.

### 2. Políticas RLS Completas (Sección 8)
Se añadirán políticas para todas las tablas:
- **`user_roles`**: Lectura propia o staff.
- **`volunteer_skills`**: Inserción anónima, lectura propia o staff.
- **`availability`**: Inserción anónima, lectura propia o staff.
- **`accommodation_requests`**: Inserción anónima, lectura propia o staff.
- **`calendar_assignments`**: Lectura/escritura staff o lectura propia.
- **`audit_logs`**: Solo admins.
- **`system_settings`**: Solo admins.

### 3. Configuración pg_cron
Se añadirá una nueva sección (Sección 10) con los comandos para programar estas tareas si la extensión `pg_cron` está habilitada.

## Pasos

1. Leer el contenido actual de `MIGRACION_SUPABASE.md`.
2. Insertar las nuevas funciones en la sección de "FUNCIONES Y RPC".
3. Completar la sección de "PERMISOS RLS" con las políticas detalladas para cada tabla.
4. Añadir la sección de programación de tareas.
5. Verificar que el SQL sea una unidad coherente y lista para ejecutar.
