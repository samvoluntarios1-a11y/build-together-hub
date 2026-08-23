# Guía de Migración a Supabase Propio (Esquema Final Auditado)

Esta guía ha sido auditada exhaustivamente para coincidir con el código actual de la aplicación. Seguí estos pasos para migrar a tu propio Supabase.

## 1. Conexión del Proyecto

1.  En Lovable, hacé clic en **"View Backend"**.
2.  Ingresá tu **Project URL** y **Anon Key** de tu proyecto propio de Supabase.
3.  Lovable actualizará automáticamente las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## 2. Script SQL Completo (Esquema Auditado)

Copiá y ejecutá este script completo en el **SQL Editor** de tu Supabase.

```sql
-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. TIPOS Y ENUMS
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'volunteer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLAS
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    locality TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

CREATE TABLE public.work_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'hard-hat',
    color TEXT NOT NULL DEFAULT '#1a3a5c',
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.volunteer_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.work_categories(id) ON DELETE CASCADE NOT NULL,
    skill_level TEXT NOT NULL, -- 'primaria', 'secundaria', 'basica'
    years_experience INTEGER DEFAULT 0 NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (volunteer_id, category_id)
);

CREATE TABLE public.availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    available_date DATE NOT NULL,
    week_number INTEGER,
    month INTEGER,
    year INTEGER,
    is_available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (volunteer_id, available_date)
);

CREATE TABLE public.accommodation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
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
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (volunteer_id, assignment_date, category_id)
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

-- 4. ÍNDICES
CREATE INDEX idx_profiles_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_profiles_locality_trgm ON public.profiles USING gin (locality gin_trgm_ops);
CREATE INDEX idx_availability_date ON public.availability (available_date);
CREATE INDEX idx_assignments_date ON public.calendar_assignments (assignment_date);

-- 5. FUNCIONES Y RPC
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
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

-- 6. TRIGGERS
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

-- 7. RESTRICCIÓN DE 3 HABILIDADES
CREATE OR REPLACE FUNCTION public.enforce_skill_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.volunteer_skills WHERE volunteer_id = NEW.volunteer_id) >= 3 THEN
    RAISE EXCEPTION 'Un voluntario no puede tener más de 3 habilidades.';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_limit_skills BEFORE INSERT ON public.volunteer_skills FOR EACH ROW EXECUTE FUNCTION enforce_skill_limits();

-- 8. PERMISOS RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated, anon;
CREATE POLICY "Public insert profile" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff select all or own" ON public.profiles FOR SELECT TO authenticated USING (is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Staff update all or own" ON public.profiles FOR UPDATE TO authenticated USING (is_staff(auth.uid()) OR user_id = auth.uid());

ALTER TABLE public.work_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.work_categories TO authenticated, anon;
CREATE POLICY "Public read active categories" ON public.work_categories FOR SELECT TO anon, authenticated USING (is_active = true OR is_staff(auth.uid()));

-- 9. DATOS INICIALES
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
('project_start_date', '"2026-09-01"', 'Inicio de obra'),
('project_end_date', '"2028-03-01"', 'Fin de obra (18 meses)'),
('cleanup_availability_days', '7', 'Días para borrar disponibilidad pasada'),
('cleanup_assignments_days', '30', 'Días para borrar asignaciones antiguas');
```
