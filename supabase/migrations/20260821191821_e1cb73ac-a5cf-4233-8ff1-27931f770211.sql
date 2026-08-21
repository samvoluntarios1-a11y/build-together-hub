CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'volunteer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  volunteer_number text NOT NULL UNIQUE,
  full_name text NOT NULL,
  locality text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.work_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text NOT NULL DEFAULT '#1a3a5c',
  icon text NOT NULL DEFAULT 'hard-hat',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.work_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_categories TO authenticated;
GRANT ALL ON public.work_categories TO service_role;
ALTER TABLE public.work_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.volunteer_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.work_categories(id) ON DELETE CASCADE,
  skill_level text NOT NULL CHECK (skill_level IN ('primaria','secundaria','basica')),
  years_experience integer NOT NULL DEFAULT 0 CHECK (years_experience BETWEEN 0 AND 50),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, category_id)
);
GRANT INSERT ON public.volunteer_skills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_skills TO authenticated;
GRANT ALL ON public.volunteer_skills TO service_role;
ALTER TABLE public.volunteer_skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_date date NOT NULL,
  week_number integer GENERATED ALWAYS AS ((EXTRACT(WEEK FROM available_date))::integer) STORED,
  month integer GENERATED ALWAYS AS ((EXTRACT(MONTH FROM available_date))::integer) STORED,
  year integer GENERATED ALWAYS AS ((EXTRACT(YEAR FROM available_date))::integer) STORED,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, available_date)
);
GRANT INSERT ON public.availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability TO authenticated;
GRANT ALL ON public.availability TO service_role;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accommodation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  needs_accommodation boolean NOT NULL DEFAULT false,
  locality_origin text,
  dates_needed_start date,
  dates_needed_end date,
  special_requirements text,
  is_fulfilled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.accommodation_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accommodation_requests TO authenticated;
GRANT ALL ON public.accommodation_requests TO service_role;
ALTER TABLE public.accommodation_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.calendar_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.work_categories(id) ON DELETE CASCADE,
  assignment_date date NOT NULL,
  week_number integer GENERATED ALWAYS AS ((EXTRACT(WEEK FROM assignment_date))::integer) STORED,
  month integer GENERATED ALWAYS AS ((EXTRACT(MONTH FROM assignment_date))::integer) STORED,
  year integer GENERATED ALWAYS AS ((EXTRACT(YEAR FROM assignment_date))::integer) STORED,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  skill_type text NOT NULL DEFAULT 'primaria' CHECK (skill_type IN ('primaria','secundaria')),
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','confirmed','cancelled','completed')),
  notes text,
  check_in_time timestamptz,
  check_out_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, assignment_date, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_assignments TO authenticated;
GRANT ALL ON public.calendar_assignments TO service_role;
ALTER TABLE public.calendar_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','coordinator'))
$$;

CREATE OR REPLACE FUNCTION public.check_volunteer_number_available(p_number text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE volunteer_number = trim(p_number))
$$;
GRANT EXECUTE ON FUNCTION public.check_volunteer_number_available(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_accommodation_updated BEFORE UPDATE ON public.accommodation_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.calendar_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_audit() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE((CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD)->>'id') ELSE (to_jsonb(NEW)->>'id') END)::uuid, NULL),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.work_categories FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_assignments AFTER INSERT OR UPDATE OR DELETE ON public.calendar_assignments FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_accommodation AFTER INSERT OR UPDATE OR DELETE ON public.accommodation_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE POLICY profiles_insert_public ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY profiles_delete_admin ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_all ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY categories_read ON public.work_categories FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_staff(auth.uid()));
CREATE POLICY categories_admin_insert ON public.work_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY categories_admin_update ON public.work_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY categories_admin_delete ON public.work_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY skills_insert_public ON public.volunteer_skills FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY skills_select ON public.volunteer_skills FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = volunteer_id AND p.user_id = auth.uid()));
CREATE POLICY skills_update_staff ON public.volunteer_skills FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY skills_delete_staff ON public.volunteer_skills FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY availability_insert_public ON public.availability FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY availability_select ON public.availability FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = volunteer_id AND p.user_id = auth.uid()));
CREATE POLICY availability_delete_staff ON public.availability FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY accommodation_insert_public ON public.accommodation_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY accommodation_select ON public.accommodation_requests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = volunteer_id AND p.user_id = auth.uid()));
CREATE POLICY accommodation_update_staff ON public.accommodation_requests FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY accommodation_delete_admin ON public.accommodation_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY assignments_select ON public.calendar_assignments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = volunteer_id AND p.user_id = auth.uid()));
CREATE POLICY assignments_insert_staff ON public.calendar_assignments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY assignments_update_staff ON public.calendar_assignments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY assignments_delete_staff ON public.calendar_assignments FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY audit_select_admin ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY audit_insert_authenticated ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY settings_admin_select ON public.system_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY settings_admin_insert ON public.system_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY settings_admin_update ON public.system_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY settings_admin_delete ON public.system_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_availability_date ON public.availability (available_date);
CREATE INDEX idx_availability_volunteer ON public.availability (volunteer_id);
CREATE INDEX idx_skills_volunteer ON public.volunteer_skills (volunteer_id);
CREATE INDEX idx_skills_category ON public.volunteer_skills (category_id);
CREATE INDEX idx_assignments_date ON public.calendar_assignments (assignment_date);
CREATE INDEX idx_assignments_volunteer ON public.calendar_assignments (volunteer_id);
CREATE INDEX idx_assignments_category ON public.calendar_assignments (category_id);
CREATE INDEX idx_profiles_locality_trgm ON public.profiles USING gin (locality gin_trgm_ops);
CREATE INDEX idx_profiles_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_audit_created ON public.audit_logs (created_at);

CREATE OR REPLACE FUNCTION public.cleanup_old_availability() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE days integer; deleted integer;
BEGIN
  SELECT COALESCE((value #>> '{}')::int, 7) INTO days FROM public.system_settings WHERE key = 'cleanup_availability_days';
  DELETE FROM public.availability WHERE available_date < current_date - COALESCE(days, 7);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_assignments() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE days integer; deleted integer;
BEGIN
  SELECT COALESCE((value #>> '{}')::int, 30) INTO days FROM public.system_settings WHERE key = 'cleanup_assignments_days';
  DELETE FROM public.calendar_assignments WHERE assignment_date < current_date - COALESCE(days, 30) AND status NOT IN ('confirmed','completed');
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

SELECT cron.schedule('cleanup-availability-daily', '0 3 * * *', $cron$SELECT public.cleanup_old_availability()$cron$);
SELECT cron.schedule('cleanup-assignments-daily', '30 3 * * *', $cron$SELECT public.cleanup_old_assignments()$cron$);

INSERT INTO public.work_categories (name, description, color, icon, sort_order) VALUES
  ('Construcción', 'Trabajos generales de construcción y estructura', '#f97316', 'hard-hat', 1),
  ('Electricidad', 'Instalaciones eléctricas y cableado', '#eab308', 'zap', 2),
  ('Pintura', 'Pintura de interiores y exteriores', '#3b82f6', 'paintbrush', 3),
  ('Carpintería', 'Trabajos en madera, aberturas y muebles', '#a16207', 'hammer', 4),
  ('Albañilería', 'Mampostería, revoques y hormigón', '#ef4444', 'brick-wall', 5),
  ('Plomería', 'Instalaciones de agua y gas', '#06b6d4', 'wrench', 6),
  ('Limpieza', 'Limpieza y mantenimiento del predio', '#22c55e', 'sparkles', 7),
  ('Logística', 'Movimiento de materiales y organización', '#8b5cf6', 'truck', 8),
  ('Cocina', 'Preparación de alimentos para voluntarios', '#ec4899', 'chef-hat', 9),
  ('Jardinería', 'Espacios verdes y exteriores', '#84cc16', 'leaf', 10);

INSERT INTO public.system_settings (key, value, description) VALUES
  ('project_name', '"Obra de Construcción"', 'Nombre del proyecto'),
  ('project_start_date', '"2026-09-01"', 'Fecha de inicio de la obra'),
  ('project_end_date', '"2028-03-01"', 'Fecha de fin de la obra (18 meses)'),
  ('cleanup_availability_days', '7', 'Días de antigüedad para borrar disponibilidad pasada'),
  ('cleanup_assignments_days', '30', 'Días de antigüedad para borrar asignaciones no confirmadas'),
  ('max_skills_per_volunteer', '3', 'Máximo de habilidades por voluntario');