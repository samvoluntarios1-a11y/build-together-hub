-- 1. Tabla de disponibilidad flexible
CREATE TABLE public.flexible_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  frequency_type text NOT NULL,
  max_occurrences integer,
  start_date date,
  end_date date,
  preferred_days jsonb,
  is_any_day boolean NOT NULL DEFAULT false,
  preferred_shift text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flexible_availability_frequency_type_check
    CHECK (frequency_type IN ('weekly','monthly','unlimited')),
  CONSTRAINT flexible_availability_shift_check
    CHECK (preferred_shift IS NULL OR preferred_shift IN ('morning','afternoon','full_day','any')),
  CONSTRAINT flexible_availability_occurrences_check CHECK (
    (frequency_type = 'unlimited' AND max_occurrences IS NULL)
    OR (frequency_type IN ('weekly','monthly') AND max_occurrences IS NOT NULL AND max_occurrences > 0)
  ),
  CONSTRAINT flexible_availability_dates_check
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT flexible_availability_days_check CHECK (
    is_any_day = true
    OR (preferred_days IS NOT NULL AND jsonb_typeof(preferred_days) = 'array' AND jsonb_array_length(preferred_days) > 0)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flexible_availability TO authenticated;
GRANT ALL ON public.flexible_availability TO service_role;

ALTER TABLE public.flexible_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY flexible_select ON public.flexible_availability
  FOR SELECT TO authenticated
  USING (
    is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = flexible_availability.volunteer_id AND p.user_id = auth.uid())
  );

CREATE POLICY flexible_insert_staff ON public.flexible_availability
  FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY flexible_update_staff ON public.flexible_availability
  FOR UPDATE TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

CREATE POLICY flexible_delete_admin ON public.flexible_availability
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Índices
CREATE INDEX idx_flexible_volunteer ON public.flexible_availability (volunteer_id);
CREATE INDEX idx_flexible_active ON public.flexible_availability (is_active);
CREATE INDEX idx_flexible_start ON public.flexible_availability (start_date);
CREATE INDEX idx_flexible_end ON public.flexible_availability (end_date);
CREATE INDEX idx_flexible_frequency ON public.flexible_availability (frequency_type);

-- Evitar reglas idénticas duplicadas
CREATE UNIQUE INDEX idx_flexible_unique_rule ON public.flexible_availability (
  volunteer_id,
  frequency_type,
  COALESCE(max_occurrences, -1),
  COALESCE(start_date, '1900-01-01'::date),
  COALESCE(end_date, '2999-12-31'::date),
  is_any_day,
  COALESCE(preferred_days::text, ''),
  COALESCE(preferred_shift, '')
) WHERE is_active = true;

-- 3. Triggers
CREATE TRIGGER trg_flexible_updated
  BEFORE UPDATE ON public.flexible_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_flexible
  AFTER INSERT OR UPDATE OR DELETE ON public.flexible_availability
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- 4. Metadatos de origen en las asignaciones
ALTER TABLE public.calendar_assignments
  ADD COLUMN IF NOT EXISTS availability_source text NOT NULL DEFAULT 'specific_date',
  ADD COLUMN IF NOT EXISTS flexible_rule_id uuid REFERENCES public.flexible_availability(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_reason text;

ALTER TABLE public.calendar_assignments
  ADD CONSTRAINT calendar_assignments_source_check
  CHECK (availability_source IN ('specific_date','flexible','override','manual'));

CREATE INDEX IF NOT EXISTS idx_assignments_volunteer_date
  ON public.calendar_assignments (volunteer_id, assignment_date);

-- 5. Limpieza: desactivar reglas vencidas (nunca borrarlas)
CREATE OR REPLACE FUNCTION public.deactivate_expired_flexible_availability()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE updated_count integer;
BEGIN
  UPDATE public.flexible_availability
     SET is_active = false
   WHERE is_active = true
     AND end_date IS NOT NULL
     AND end_date < current_date;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;