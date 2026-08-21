# Build Together Hub

Crea una aplicación web de gestión de voluntarios para una obra . La app tendrá dos partes:

1. FORMULARIO PÚBLICO DE REGISTRO (cualquiera puede acceder sin login)
2. DASHBOARD DE ADMINISTRADOR (requiere autenticación con email/password)

CONTEXTO DEL PROYECTO:
- Obra de construcción que durará 18 meses
- Más de 1000 voluntarios se registrarán desde el formulario público
- Necesita máxima seguridad en la parte de administración
- El formulario de registro debe ser accesible para cualquier persona sin necesidad de crear cuenta

=== PARTE 1: FORMULARIO PÚBLICO DE REGISTRO ===

PANTALLA PÚBLICA: /register (NO requiere autenticación, cualquiera puede acceder)

Esta es la página principal que verán los voluntarios. Debe ser moderna, fácil de usar y funcionar perfecto en móviles.

SECCIÓN 1 - DATOS PERSONALES:
- Número de voluntario (input texto, obligatorio, único - validar que no exista ya en la base de datos)
- Nombre completo (input texto, obligatorio)
- Localidad (input texto, obligatorio, ejemplo: "Junín - Mendoza")

SECCIÓN 2 - HABILIDADES (máximo 3):
- El voluntario puede agregar hasta 3 habilidades que tiene
- Botón "Agregar habilidad" que abre un formulario para cada habilidad:
  * Seleccionar categoría de trabajo de una lista desplegable (las categorías vienen de una tabla configurable por el admin: Electricidad, Construcción, Pintura, Carpintería, Limpieza, Logística, etc.)
  * Seleccionar nivel de habilidad: Primaria (la que mejor sabe), Secundaria (sabe bien), o Básica (sabe lo mínimo)
  * Años de experiencia (número del 0 al 50)
  * Descripción breve de la experiencia (textarea, máximo 200 caracteres, opcional, ej: "3 años instalando cableado monofásico")
- Mostrar las habilidades agregadas como cards visuales que se pueden eliminar
- Validar que no se repitan categorías
- El botón "Agregar habilidad" se deshabilita cuando llega a 3 habilidades

SECCIÓN 3 - DISPONIBILIDAD DE FECHAS:
- Calendario interactivo que muestra los próximos 18 meses
- El voluntario hace click en los días que está disponible (se marcan en verde)
- Botones rápidos: "Seleccionar semana completa", "Seleccionar mes completo"
- Selector de rango de fechas (fecha inicio - fecha fin) para seleccionar períodos largos de una vez
- Mostrar resumen: "Seleccionaste X días disponibles"
- Validar que seleccione al menos 1 día antes de continuar

SECCIÓN 4 - ALOJAMIENTO:
- Pregunta clara: ¿Necesitas alojamiento durante la obra? (toggle grande Sí/No)
- Si responde Sí, mostrar campos adicionales:
  * Localidad de origen (desde dónde viene)
  * Fecha de inicio necesaria
  * Fecha de fin necesaria
  * Requisitos especiales (textarea, opcional, ej: "Necesito cama, soy alérgico a...")

SECCIÓN 5 - REVISIÓN Y ENVÍO:
- Mostrar resumen completo de todos los datos ingresados en forma de cards
- Checkbox obligatorio: "Confirmo que todos los datos son correctos"
- Botón grande "Enviar registro"
- Al enviar:
  * Guardar todos los datos en la base de datos
  * Mostrar mensaje de éxito: "¡Gracias por registrarte! Tu número de voluntario es #XXXX"
  * Opción de descargar comprobante en PDF
  * Redirigir a página de agradecimiento

FUNCIONALIDADES DEL FORMULARIO:
- Auto-guardado en localStorage cada 30 segundos (por si se cierra la pestaña sin querer)
- Validación en tiempo real con mensajes claros y amigables
- Loading state mientras se envía el formulario
- Manejo de errores (ej: si el número de voluntario ya existe, mostrar "Este número ya está registrado, por favor verifica tu número")
- Totalmente responsive (debe funcionar perfecto en celulares)
- Barra de progreso arriba mostrando los 5 pasos

DISEÑO DEL FORMULARIO:
- Paleta de colores: azul marino (#1a3a5c) como color principal, cyan (#00d4ff) para botones y acentos
- Estilo moderno y limpio, con cards, sombras suaves y bordes redondeados
- Tipografía sans-serif moderna (Inter o Poppins)
- Inputs grandes y fáciles de tocar en móvil
- Espaciado generoso entre secciones
- Progress bar arriba mostrando en qué paso está

=== PARTE 2: DASHBOARD DE ADMINISTRADOR (CON LOGIN) ===

PANTALLAS DE AUTENTICACIÓN:
- /login - Formulario de login con email y contraseña (SOLO para admins/coordinadores)
- /forgot-password - Recuperar contraseña
- Las rutas de admin están protegidas, si no hay sesión redirige a /login

CONFIGURACIÓN DE SEGURIDAD (CRÍTICO):
1. Usar SOLO la anon key de Supabase en el frontend (nunca exponer la service_role key)
2. Habilitar Row Level Security (RLS) en TODAS las tablas
3. Autenticación con email y contraseña, con verificación de email obligatoria para admins
4. Contraseñas mínimas de 8 caracteres
5. Límite de 5 intentos de login por hora
6. HTTPS obligatorio en producción
7. CORS restringido solo al dominio de producción

=== BASE DE DATOS (SUPABASE) ===

Crear las siguientes tablas con sus relaciones:

TABLA: profiles
- Guarda la información de cada voluntario
- Campos: id, user_id (relación con auth.users, nullable porque los voluntarios no tienen user_id al principio), volunteer_number (único), full_name, locality, role (volunteer/admin/coordinator), is_active, created_at, updated_at
- POLÍTICA RLS: Cualquiera puede insertar (registro público), los voluntarios solo ven/editan su propio perfil, admins ven todos los perfiles

TABLA: work_categories
- Categorías de trabajo configurables por el admin
- Campos: id, name, description, color (para identificar visualmente), icon, sort_order, is_active, created_at
- POLÍTICA RLS: Todos pueden leer (para el formulario público), solo admins pueden crear/editar/borrar

TABLA: volunteer_skills
- Guarda hasta 3 habilidades por voluntario
- Campos: id, volunteer_id, category_id, skill_level (primaria/secundaria/básica), years_experience, description, created_at
- POLÍTICA RLS: Cualquiera puede insertar (desde el formulario público), los voluntarios solo ven/editan sus propias habilidades, admins ven todas

TABLA: availability
- Guarda los días que el voluntario está disponible
- Campos: id, volunteer_id, available_date, week_number, month, year, is_available, created_at
- POLÍTICA RLS: Cualquiera puede insertar (desde el formulario público), los voluntarios solo ven su propia disponibilidad, admins ven toda la disponibilidad
- IMPORTANTE: Implementar limpieza automática para borrar fechas pasadas (más de 7 días atrás) y ahorrar espacio

TABLA: accommodation_requests
- Guarda si el voluntario necesita alojamiento
- Campos: id, volunteer_id, needs_accommodation, locality_origin, dates_needed_start, dates_needed_end, special_requirements, is_fulfilled, created_at, updated_at
- POLÍTICA RLS: Cualquiera puede insertar (desde el formulario público), los voluntarios solo ven su propia solicitud, admins ven todas

TABLA: calendar_assignments
- Guarda las asignaciones de voluntarios a días y categorías
- Campos: id, volunteer_id, category_id, assignment_date, week_number, month, year, assigned_by, skill_type (primaria/secundaria), status (assigned/confirmed/cancelled/completed), notes, check_in_time, check_out_time, created_at, updated_at
- POLÍTICA RLS: Solo admins/coordinadores pueden insertar/editar/borrar, voluntarios solo ven sus propias asignaciones

TABLA: audit_logs
- Registra todos los cambios importantes
- Campos: id, user_id, action, table_name, record_id, old_value, new_value, ip_address, user_agent, created_at
- POLÍTICA RLS: Solo admins pueden leer

TABLA: system_settings
- Configuración global del sistema
- Campos: id, key, value (JSON), description, updated_by, updated_at
- Ejemplos de configuración: project_start_date, project_end_date (18 meses), cleanup_availability_days (7), cleanup_assignments_days (30), etc.
- POLÍTICA RLS: Solo admins pueden leer/editar

FUNCIONES DE LIMPIEZA AUTOMÁTICA:
- Crear una función que borre automáticamente la disponibilidad de fechas pasadas (más de 7 días atrás)
- Crear una función que borre asignaciones de hace más de 30 días (excepto las confirmadas/completadas, por auditoría)
- Estas funciones se deben ejecutar diariamente (usar pg_cron o Edge Function con cron)

ÍNDICES DE PERFORMANCE:
- Crear índices en las columnas que más se usan para buscar: available_date, volunteer_id, category_id, assignment_date, locality (con trigram para búsqueda rápida)

=== DASHBOARD DE ADMINISTRADOR ===

PANTALLA: /admin/dashboard (solo accesible para roles: admin o coordinator)

LAYOUT:
- Sidebar izquierda con navegación: Dashboard, Calendario, Voluntarios, Categorías, Reportes
- Header con título y filtros globales
- Contenido principal con KPIs y tabla

FILTROS PRINCIPALES:
1. Categoría de trabajo: dropdown multi-select
2. Rango de fechas: date picker (inicio - fin)
3. Nivel de habilidad: radio buttons (Primaria / Secundaria / Todas)
4. Alojamiento: toggle (Sí / No / Todos)
5. Localidad: input con autocomplete
6. Botones: "Aplicar filtros" y "Limpiar"

KPIs (4 cards arriba):
- Total de voluntarios disponibles en el rango de fechas
- Voluntarios con habilidad primaria
- Voluntarios con habilidad secundaria
- Voluntarios que necesitan alojamiento

TABLA DE VOLUNTARIOS:
- Columnas: Nombre, N° Voluntario, Localidad, Categoría (badge con color), Nivel (badge verde/amarillo), Años experiencia, Disponibilidad (badge), Alojamiento (icono), Acciones (Ver perfil, Asignar)
- Ordenar por: skill_level (primaria primero), years_experience DESC
- Paginación: 50 por página
- Búsqueda con debounce (300ms)
- Exportar a CSV

ASIGNACIÓN RÁPIDA:
- Checkboxes para seleccionar múltiples voluntarios
- Panel con: cantidad seleccionados, dropdown categoría, date picker fecha, textarea notas, botón "Asignar"

=== PANTALLA DE CALENDARIO ===

PANTALLA: /admin/calendario

VISTAS:
- Vista semanal (default): 7 días (Lun-Dom)
- Vista mensual: grid del mes completo
- Toggle: [Semana] [Mes]

VISTA SEMANAL:
- Encabezado: "Semana 34 (18-24 Ago 2026)" con flechas de navegación
- 7 columnas (una por día)
- Cada columna muestra asignaciones agrupadas por categoría
- Cada asignación es una card con: icono/color categoría, nombre voluntario, N° voluntario, badge nivel, icono alojamiento, botón eliminar
- Drag-and-drop para mover asignaciones entre días/categorías

ASIGNAR VOLUNTARIO:
- Click en celda vacía → abre modal
- Modal muestra: categoría (dropdown), buscar voluntario (autocomplete), lista de sugeridos (voluntarios con esa habilidad + disponibilidad en esa fecha)
- Sugeridos muestran: nombre, N° voluntario, badge nivel, badge disponibilidad
- Click en voluntario → asignar
- Campo notas opcional

GESTIÓN DE ASIGNACIONES:
- Click en card asignada → modal con: ver perfil, editar notas, cambiar categoría, mover a otro día, cambiar estado, eliminar

FILTROS:
- Toggle: "Mostrar solo asignados" / "Mostrar disponibles"
- Filtro por categoría: checkboxes
- Filtro por habilidad: primaria/secundaria/todas

EXPORTAR:
- Botón "Exportar" → opciones: semana/mes, formato PDF/Excel
- PDF: diseño profesional, una página por día, lista por categoría
- Excel: una hoja por semana, columnas: Fecha, Día, Categoría, Nombre, N° Voluntario, Habilidad, Años Exp, Localidad, Alojamiento, Notas

=== PANTALLA DE GESTIÓN DE CATEGORÍAS ===

PANTALLA: /admin/categorias (solo admins)

- Lista de categorías existentes con: nombre, color, icono, orden, estado (activo/inactivo)
- Botón "Nueva categoría"
- Formulario para crear/editar: nombre, descripción, color (picker), icono (selector), orden, activo (toggle)
- Drag-and-drop para reordenar categorías
- Toggle para activar/desactivar categorías (las desactivadas no aparecen en el formulario público)

=== PANTALLA DE REPORTES ===

PANTALLA: /admin/reportes

OPCIONES:
1. Reporte por semana/mes: selector tipo, selector semana/mes, selector categorías, selector formato (PDF/Excel), botón generar
2. Reporte por categoría: selector categoría, selector fechas, selector formato, botón generar
3. Reporte de alojamiento: selector fechas, formato Excel, botón generar

DISEÑO PDF:
- Header con logo y título
- Por día: lista de voluntarios por categoría
- Columnas: Nombre, N° Voluntario, Habilidad, Años Exp, Alojamiento, Notas
- Footer: fecha de generación, número de página

DISEÑO EXCEL:
- Hoja 1: Resumen
- Hoja 2: Detalle por día
- Hoja 3: Alojamiento (si aplica)
- Headers en azul, filas alternas, filtros automáticos

=== STACK TÉCNICO ===

- React + Vite + TypeScript
- TailwindCSS para estilos
- @supabase/supabase-js para conectar con Supabase
- React Router para navegación
- React Hook Form + Zod para formularios
- React Hot Toast para notificaciones
- React Calendar o similar para el calendario del formulario
- FullCalendar o react-big-calendar para el calendario de admin
- @dnd-kit para drag-and-drop
- @react-pdf/renderer para PDF
- xlsx o SheetJS para Excel
- TanStack Table para la tabla de admin
- React Query para cachear queries

=== DISEÑO GENERAL ===

- Paleta: azul marino (#1a3a5c) principal, cyan (#00d4ff) acentos, fondo gris claro (#f5f7fa)
- Estilo: moderno, minimalista, cards con sombras suaves, bordes redondeados (8-12px)
- Tipografía: Inter o Poppins
- Responsive: mobile-first
- Loading states y feedback visual claro
- Empty states ilustrados cuando no hay datos

=== NOTAS IMPORTANTES ===

1. El formulario público (/register) NO requiere autenticación - cualquiera puede acceder y registrarse
2. Solo el dashboard de admin (/admin/*) requiere login
3. El proyecto dura 18 meses - optimizar para performance con muchos datos
4. Se registrarán 1000+ voluntarios - usar paginación, índices, y limpieza automática
5. La seguridad es crítica - verificar dos veces las políticas RLS
6. El formulario debe ser súper fácil de usar en celulares
7. Los admins necesitan encontrar voluntarios rápidamente con filtros eficientes
8. El calendario debe permitir asignar cientos de personas de forma ordenada
9. Los reportes deben ser profesionales para imprimir y compartir

=== ENTREGABLES ESPERADOS ===

1. Formulario público funcional en /register
2. Sistema de autenticación para admins en /login
3. Dashboard de admin con filtros en /admin/dashboard
4. Calendario de asignaciones en /admin/calendario
5. Gestión de categorías en /admin/categorias
6. Sistema de reportes en /admin/reportes
7. Base de datos Supabase configurada con todas las tablas, políticas RLS, índices y funciones de limpieza
8. Diseño moderno y responsive en toda la app

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/63361328-eb83-4ba1-a11f-ceb7adc0d932).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
