import {
  FREQUENCY_LABELS,
  SHIFT_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  type FrequencyType,
  type PreferredShift,
} from "@/lib/flexible";

export interface FlexibleDraft {
  frequency_type: FrequencyType;
  max_occurrences: number;
  start_date: string;
  end_date: string;
  preferred_days: number[];
  is_any_day: boolean;
  preferred_shift: PreferredShift | "";
  notes: string;
}

export const EMPTY_FLEXIBLE: FlexibleDraft = {
  frequency_type: "weekly",
  max_occurrences: 1,
  start_date: "",
  end_date: "",
  preferred_days: [],
  is_any_day: false,
  preferred_shift: "",
  notes: "",
};

// Lunes primero
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  value: FlexibleDraft;
  onChange: (next: FlexibleDraft) => void;
  minDate: string;
  error?: string | undefined;
}

export function FlexibleAvailabilityForm({ value, onChange, minDate, error }: Props) {
  const patch = (p: Partial<FlexibleDraft>) => onChange({ ...value, ...p });

  const toggleDay = (day: number) => {
    const next = value.preferred_days.includes(day)
      ? value.preferred_days.filter((d) => d !== day)
      : [...value.preferred_days, day];
    patch({ preferred_days: next, is_any_day: false });
  };

  return (
    <div className="space-y-6">
      {/* Frecuencia */}
      <div>
        <label className="mb-2 block text-sm font-semibold">
          ¿Con qué frecuencia podés colaborar? *
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(FREQUENCY_LABELS) as FrequencyType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => patch({ frequency_type: f })}
              className={[
                "rounded-xl border-2 px-3 py-3 text-sm font-bold transition",
                value.frequency_type === f
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border bg-card text-muted-foreground",
              ].join(" ")}
              aria-pressed={value.frequency_type === f}
            >
              {FREQUENCY_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Cupo */}
      {value.frequency_type !== "unlimited" && (
        <div>
          <label htmlFor="max_occurrences" className="mb-1.5 block text-sm font-semibold">
            ¿Cuántos días por {value.frequency_type === "weekly" ? "semana" : "mes"}? *
          </label>
          <input
            id="max_occurrences"
            type="number"
            min={1}
            max={value.frequency_type === "weekly" ? 7 : 31}
            className="input-field w-32"
            value={value.max_occurrences}
            onChange={(e) => patch({ max_occurrences: Number(e.target.value) })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Nunca te vamos a asignar más días que este límite.
          </p>
        </div>
      )}

      {/* Días preferidos */}
      <div>
        <label className="mb-2 block text-sm font-semibold">
          ¿Qué días de la semana te quedan mejor? *
        </label>
        <div className="flex flex-wrap gap-2">
          {DAY_ORDER.map((d) => {
            const active = !value.is_any_day && value.preferred_days.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                aria-pressed={active}
                aria-label={WEEKDAY_LABELS[d]}
                className={[
                  "min-w-[64px] rounded-xl border-2 px-3 py-2 text-sm font-bold transition",
                  active
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border bg-card text-muted-foreground",
                ].join(" ")}
              >
                {WEEKDAY_SHORT[d]}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4.5 w-4.5 accent-[#00b8dd]"
            checked={value.is_any_day}
            onChange={(e) =>
              patch({ is_any_day: e.target.checked, preferred_days: e.target.checked ? [] : value.preferred_days })
            }
          />
          Cualquier día me sirve
        </label>
      </div>

      {/* Vigencia */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          ¿Hasta cuándo vale esta disponibilidad?{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs text-muted-foreground">Desde</span>
            <input
              type="date"
              className="input-field"
              min={minDate}
              value={value.start_date}
              onChange={(e) => patch({ start_date: e.target.value })}
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Hasta</span>
            <input
              type="date"
              className="input-field"
              min={value.start_date || minDate}
              value={value.end_date}
              onChange={(e) => patch({ end_date: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Turno */}
      <div>
        <label className="mb-2 block text-sm font-semibold">
          Turno preferido <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(SHIFT_LABELS) as PreferredShift[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => patch({ preferred_shift: value.preferred_shift === s ? "" : s })}
              className={[
                "rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition",
                value.preferred_shift === s
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border bg-card text-muted-foreground",
              ].join(" ")}
              aria-pressed={value.preferred_shift === s}
            >
              {SHIFT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label htmlFor="flex_notes" className="mb-1.5 block text-sm font-semibold">
          Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="flex_notes"
          className="textarea-field"
          rows={3}
          maxLength={500}
          placeholder='Ej: "Puedo avisar con 2 días de anticipación"'
          value={value.notes}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
