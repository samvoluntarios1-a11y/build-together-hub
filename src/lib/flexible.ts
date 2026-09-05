/**
 * Disponibilidad flexible — tipos y utilidades puras (cliente y servidor).
 *
 * Un voluntario puede indicar disponibilidad de dos maneras:
 *  1. Fechas específicas  → tabla `availability`
 *  2. Regla flexible      → tabla `flexible_availability`
 */

export type FrequencyType = "weekly" | "monthly" | "unlimited";
export type PreferredShift = "manana" | "tarde" | "completo";

export interface FlexibleRule {
  id?: string;
  volunteer_id?: string;
  frequency_type: FrequencyType;
  max_occurrences: number | null;
  start_date: string | null;
  end_date: string | null;
  /** Días de la semana 0=Domingo … 6=Sábado */
  preferred_days: number[] | null;
  is_any_day: boolean;
  preferred_shift: PreferredShift | null;
  notes: string | null;
  is_active: boolean;
}

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  weekly: "Por semana",
  monthly: "Por mes",
  unlimited: "Sin límite",
};

export const SHIFT_LABELS: Record<PreferredShift, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  completo: "Día completo",
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Convierte el JSONB crudo de la base a un arreglo de números válido. */
export function parsePreferredDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

/** Normaliza una fila de `flexible_availability` a `FlexibleRule`. */
export function toFlexibleRule(row: any): FlexibleRule {
  return {
    id: row.id,
    volunteer_id: row.volunteer_id,
    frequency_type: (row.frequency_type ?? "unlimited") as FrequencyType,
    max_occurrences: row.max_occurrences ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    preferred_days: parsePreferredDays(row.preferred_days),
    is_any_day: !!row.is_any_day,
    preferred_shift: (row.preferred_shift ?? null) as PreferredShift | null,
    notes: row.notes ?? null,
    is_active: row.is_active !== false,
  };
}

/** Día de la semana de una fecha ISO (sin desfase de zona horaria). */
export function weekdayOfISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).getDay();
}

/** ¿La regla cubre esa fecha? (vigencia + día de la semana + activa) */
export function ruleCoversDate(rule: FlexibleRule, iso: string): boolean {
  if (!rule.is_active) return false;
  if (rule.start_date && iso < rule.start_date) return false;
  if (rule.end_date && iso > rule.end_date) return false;
  if (rule.is_any_day) return true;
  const days = rule.preferred_days ?? [];
  if (days.length === 0) return true;
  return days.includes(weekdayOfISO(iso));
}

/** Lunes de la semana (ISO) que contiene la fecha dada. */
export function weekBoundsISO(iso: string): { from: string; to: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const dow = (date.getDay() + 6) % 7; // 0 = lunes
  const start = new Date(date);
  start.setDate(date.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: localISO(start), to: localISO(end) };
}

export function monthBoundsISO(iso: string): { from: string; to: string } {
  const [y, m] = iso.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, 1);
  const end = new Date(y!, m ?? 1, 0);
  return { from: localISO(start), to: localISO(end) };
}

export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ventana del cupo según la frecuencia de la regla (null = sin límite). */
export function quotaWindow(
  rule: FlexibleRule,
  iso: string,
): { from: string; to: string } | null {
  if (rule.frequency_type === "weekly") return weekBoundsISO(iso);
  if (rule.frequency_type === "monthly") return monthBoundsISO(iso);
  return null;
}

/** Texto legible de la regla, para tarjetas y reportes. */
export function describeFlexible(rule: FlexibleRule): string {
  const parts: string[] = [];
  if (rule.frequency_type === "unlimited") {
    parts.push("Sin límite de días");
  } else {
    const unit = rule.frequency_type === "weekly" ? "semana" : "mes";
    const n = rule.max_occurrences ?? 1;
    parts.push(`${n} ${n === 1 ? "día" : "días"} por ${unit}`);
  }
  if (rule.is_any_day) {
    parts.push("cualquier día");
  } else if ((rule.preferred_days ?? []).length > 0) {
    parts.push(
      [...(rule.preferred_days ?? [])]
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((d) => WEEKDAY_SHORT[d])
        .join(", "),
    );
  }
  if (rule.preferred_shift) parts.push(SHIFT_LABELS[rule.preferred_shift]);
  return parts.join(" · ");
}

export function describeValidity(rule: FlexibleRule): string {
  const fmt = (iso: string) => iso.split("-").reverse().join("/");
  if (rule.start_date && rule.end_date)
    return `Del ${fmt(rule.start_date)} al ${fmt(rule.end_date)}`;
  if (rule.start_date) return `Desde el ${fmt(rule.start_date)}`;
  if (rule.end_date) return `Hasta el ${fmt(rule.end_date)}`;
  return "Sin fecha de vencimiento";
}
