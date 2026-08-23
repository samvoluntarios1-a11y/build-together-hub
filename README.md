# Voluntarios LDC

Sistema de gestión de voluntarios para proyectos de construcción de 18 meses.

## Descripción del Proyecto

Esta aplicación facilita la gestión integral de voluntarios, desde su registro público hasta su asignación en obra mediante un panel administrativo seguro.

### Funcionalidades Clave

- **Formulario Público de Registro**: Registro ágil de voluntarios con validación de habilidades, disponibilidad en calendario de 18 meses y gestión de alojamiento.
- **Dashboard Administrativo**: Panel protegido para coordinadores con KPIs en tiempo real, filtros avanzados y búsqueda optimizada.
- **Calendario de Asignaciones**: Planificación semanal/mensual con funciones de drag-and-drop y recomendaciones inteligentes basadas en habilidades.
- **Gestión de Categorías**: Administración dinámica de oficios y roles necesarios en obra.
- **Reportes Avanzados**: Generación de informes profesionales en PDF y Excel por rango de fechas, categorías y necesidades de alojamiento.

## Seguridad y Arquitectura

- **Seguridad Máxima**: Implementación estricta de Row Level Security (RLS) en base de datos.
- **Eficiencia**: Optimización para el manejo de más de 1000 voluntarios registrados.
- **Stack Tecnológico**: React, Vite, TypeScript, TailwindCSS, Supabase y TanStack Router/Query.

## Desarrollo Local

Para ejecutar el proyecto localmente, asegurate de tener Node.js instalado.

```sh
# Clonar el repositorio e instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```
