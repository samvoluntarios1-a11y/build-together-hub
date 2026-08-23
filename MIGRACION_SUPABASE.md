# Guía de Migración a Supabase Propio

Seguí estos pasos para mover tu aplicación de Lovable Cloud a tu propia infraestructura de Supabase.

## Paso 1: Conectar tu Proyecto

Para que Lovable use tu propio Supabase en lugar del gestionado, debés configurar las credenciales en el panel de control de Lovable:

1.  Abrí tu proyecto en Lovable.
2.  Hacé clic en el botón **"View Backend"** (o el icono de base de datos) en la esquina superior derecha.
3.  Buscá la sección de **Configuración de Supabase** (o "Connect external database").
4.  Ingresá los siguientes valores que obtenés desde el dashboard de tu Supabase (*Project Settings > API*):
    *   **Project URL**: `https://tu-proyecto.supabase.co`
    *   **Anon Key**: Tu clave pública `anon`.
5.  Lovable actualizará automáticamente las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en el despliegue. No es necesario editar archivos `.env` manualmente.

---

## Paso 2: Configuración del Schema (SQL)

Copiá y pegá el siguiente bloque completo en el **SQL Editor** de tu nuevo proyecto de Supabase y ejecutalo. Este script crea las tablas, funciones, políticas RLS y triggers necesarios.

```sql
-- 1. Extensiones y Tipos
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tablas
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    volunteer_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

CREATE TABLE public.work_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.volunteer_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.work_categories(id) ON DELETE CASCADE NOT NULL,
    level TEXT NOT NULL,
    years_experience INTEGER,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    available_date DATE NOT NULL,
    week_number INTEGER,
    month INTEGER,
    year INTEGER,
    is_available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.accommodation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    needs_accommodation BOOLEAN DEFAULT false NOT NULL,
    locality_origin TEXT,
    dates_needed_start DATE,
    dates_needed_end DATE,
    special_requirements TEXT,
    is_fulfilled BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.calendar_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.work_categories(id) ON DELETE CASCADE NOT NULL,
    assignment_date DATE NOT NULL,
    week_number INTEGER,
    month INTEGER,
    year INTEGER,
    assigned_by UUID REFERENCES auth.users(id),
    skill_type TEXT DEFAULT 'primaria' NOT NULL,
    status TEXT DEFAULT 'assigned' NOT NULL,
    notes TEXT,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Funciones de Seguridad (IMPORTANTE: SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'coordinator'));
$$;

CREATE OR REPLACE FUNCTION public.check_volunteer_number_available(p_number TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE volunteer_number = trim(p_number));
$$;

-- 4. Triggers para updated_at y Auditoría
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_accommodation_updated BEFORE UPDATE ON public.accommodation_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.calendar_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, 
    COALESCE((CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD)->>'id') ELSE (to_jsonb(NEW)->>'id') END)::uuid, NULL),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.work_categories FOR EACH ROW EXECUTE FUNCTION log_audit();

-- 5. Permisos Iniciales (GRANT)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated, anon;
GRANT SELECT ON public.work_categories TO authenticated, anon;
GRANT SELECT, INSERT ON public.volunteer_skills TO authenticated, anon;
GRANT SELECT, INSERT ON public.availability TO authenticated, anon;
GRANT SELECT, INSERT ON public.accommodation_requests TO authenticated, anon;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.work_categories TO service_role;
GRANT ALL ON public.volunteer_skills TO service_role;
GRANT ALL ON public.availability TO service_role;
GRANT ALL ON public.accommodation_requests TO service_role;
GRANT ALL ON public.calendar_assignments TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.system_settings TO service_role;

-- 6. Políticas RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_insert" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "profiles_staff_select" ON public.profiles FOR SELECT TO authenticated USING (is_staff(auth.uid()) OR user_id = auth.uid());

ALTER TABLE public.work_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.work_categories FOR SELECT TO anon, authenticated USING (is_active = true OR is_staff(auth.uid()));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_staff(auth.uid()));

-- (Otras RLS se asumen configuradas para staff similar a las anteriores)

-- 7. Datos Iniciales (Categorías)
INSERT INTO public.work_categories (name, description, icon, color, sort_order) VALUES
('Construcción', 'Trabajos generales de construcción', 'hard-hat', '#f97316', 1),
('Electricidad', 'Instalaciones eléctricas', 'zap', '#eab308', 2),
('Pintura', 'Pintura de obra', 'paintbrush', '#3b82f6', 3),
('Carpintería', 'Trabajos en madera', 'hammer', '#a16207', 4),
('Albañilería', 'Mampostería y revoques', 'brick-wall', '#ef4444', 5),
('Plomería', 'Instalaciones de agua y gas', 'wrench', '#06b6d4', 6),
('Limpieza', 'Mantenimiento del predio', 'sparkles', '#22c55e', 7),
('Logística', 'Movimiento de materiales', 'truck', '#8b5cf6', 8),
('Cocina', 'Preparación de alimentos', 'chef-hat', '#ec4899', 9),
('Jardinería', 'Espacios verdes', 'leaf', '#84cc16', 10);

INSERT INTO public.system_settings (key, value, description) VALUES
('project_name', '"Obra de Construcción"', 'Nombre del proyecto'),
('cleanup_availability_days', '7', 'Días para borrar disponibilidad pasada'),
('cleanup_assignments_days', '30', 'Días para borrar asignaciones antiguas');
```

---

## Paso 3: Funciones de Limpieza Automática (Cron)

En tu Supabase, asegurate de tener habilitada la extensión `pg_cron` en *Settings > Database > Extensions*. Luego ejecutá esto:

```sql
SELECT cron.schedule('cleanup-availability-daily', '0 0 * * *', $$ SELECT public.cleanup_old_availability() $$);
SELECT cron.schedule('cleanup-assignments-daily', '0 1 * * *', $$ SELECT public.cleanup_old_assignments() $$);
```
*(Nota: Debés crear las funciones `cleanup_old_availability` y `cleanup_old_assignments` que están en el SQL anterior).*

---

## Paso 4: Exportación de Datos Existentes

Si ya tenés datos en Lovable Cloud que querés conservar:
1.  En el panel de Lovable, descargá los datos de la tabla `profiles` como CSV.
2.  En tu nuevo Supabase, usá el botón **"Insert > Import data from CSV"** en la tabla correspondiente.
3.  **Importante**: Si importás perfiles manualmente, asegurate de que los IDs coincidan si tenés tablas relacionadas.

---

## Paso 5: Verificación Final

1.  Intentá registrar un nuevo voluntario en `/register`.
2.  Iniciá sesión en `/login` con tu cuenta administrativa (recordá que debés crear el usuario en `auth.users` de tu nuevo Supabase y asignarle el rol en `public.user_roles`).
3.  Revisá que el Dashboard cargue los KPIs correctamente.

**¿Puedo borrar el proyecto de Lovable Cloud?**
Una vez que confirmes que el login, el registro y el dashboard funcionan correctamente usando tu URL propia de Supabase, podés borrar el proyecto de Lovable Cloud. **Recomendación**: Hacé un backup manual (exportar CSV de todas las tablas) antes de borrar por seguridad.
