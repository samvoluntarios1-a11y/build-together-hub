# Plan de Migración a Supabase Propio

Este plan detalla los pasos para migrar la base de datos de Lovable Cloud (Supabase gestionado) a un proyecto de Supabase propio del usuario, permitiendo el control total sobre la infraestructura.

## 1. Conexión del proyecto de Supabase propio

Para conectar Lovable a tu propio Supabase, no se edita un archivo `.env` directamente en el código, sino que se utiliza la integración de Lovable Cloud.

1.  Haz clic en el botón **"View Backend"** (o en el icono de base de datos) en la barra de herramientas de Lovable.
2.  Busca la opción para **conectar una base de datos externa** o configurar las credenciales de Supabase.
3.  Ingresa allí la **URL del proyecto** y la **Anon Key** (que puedes encontrar en el Dashboard de Supabase en *Project Settings > API*).

## 2. Preparación del Schema y Datos (SQL)

Debes ejecutar los siguientes scripts en el **SQL Editor** de tu nuevo proyecto de Supabase en el orden indicado.

### A. Tipos y Extensiones
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'user');
```

### B. Tablas principales y RLS
Crearemos las tablas con sus respectivas políticas de seguridad.

```sql
-- Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated, anon;
GRANT ALL ON public.profiles TO service_role;

-- User Roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Funciones de Seguridad (Security Definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'coordinator'));
$$;
```

*(Nota: Se proporcionarán los scripts para las 9 tablas completas, incluyendo availability, categories, etc., en la respuesta final).*

## 3. Exportación e Importación de Datos

Si ya tienes voluntarios registrados, exportaremos los datos actuales en formato CSV o SQL e indicaremos cómo importarlos usando la herramienta de importación de Supabase.

## 4. Verificación y Limpieza

1.  Actualizar la conexión en Lovable.
2.  Probar el flujo de registro público.
3.  Probar el acceso al dashboard administrativo.
4.  Configurar los backups automáticos en el Dashboard de Supabase (*Project Settings > Database > Backups*).

## Detalles técnicos
- Las funciones de limpieza (cron jobs) se implementarán usando la extensión `pg_cron` en Supabase.
- Las políticas RLS se ajustarán para asegurar que solo el staff pueda ver los datos sensibles, mientras que el formulario de registro sigue siendo accesible para usuarios anónimos.
