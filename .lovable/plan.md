# Plan de mejora del Dashboard y Perfil de Voluntario

Se mejorará la interfaz de administración para permitir una visualización detallada de los voluntarios y filtros avanzados por disponibilidad.

## Objetivo 1: Perfil Completo del Voluntario

Se implementará un modal o página de detalle que muestre toda la información del voluntario:

- **Datos Básicos**: Nombre, número de voluntario, localidad y estado.
- **Habilidades**: Cards con categoría (color/icono), nivel, años de experiencia y descripción completa.
- **Disponibilidad**: 
    - Contador total y lista de fechas agrupadas por mes.
    - Calendario visual en modo lectura con días destacados en verde.
    - Switch entre vista de calendario y lista.
- **Alojamiento**: Detalle completo de necesidades (fechas, localidad, requisitos) o indicador de que no lo necesita.
- **Asignaciones**: Historial de tareas asignadas con fecha, área, estado y notas.

## Objetivo 2: Filtros Avanzados por Fecha

Se rediseñará el sistema de filtrado en el dashboard para permitir:

- **Modos de Fecha**: Día específico, rango de fechas, semana o mes completo.
- **Lógica de disponibilidad**: El filtro consultará la tabla `availability` para encontrar voluntarios con días libres efectivos.
- **Visualización de resultados**: Se mostrarán las fechas coincidentes en una columna dedicada del listado.
- **Ordenamiento inteligente**: Al filtrar por categoría, se priorizará por nivel de habilidad (Primaria > Secundaria > Básica) y años de experiencia.

## Detalles Técnicos

- **Consultas**: Se ajustarán los `select` de Supabase para incluir `calendar_assignments` y todos los campos de `accommodation_requests` y `volunteer_skills`.
- **Componentes**: 
    - Creación de `src/components/admin/VolunteerProfileModal.tsx`.
    - Integración de `Calendar` de shadcn/ui en el perfil.
    - Nuevo componente de filtros en el Dashboard.
- **Lógica**: Agrupación de fechas mediante `date-fns` o helpers nativos de JS para la vista de lista mensual.

NO se modificará el flujo de registro, RLS, ni Server Functions existentes.
