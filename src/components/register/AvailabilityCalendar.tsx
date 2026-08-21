import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PROJECT_MONTHS } from "@/lib/types";

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

interface Props {
  selected: Set<string>;
  onToggle: (iso: string) => void;
  onSelectMany: (isos: string[], value: boolean) => void;
}

export function AvailabilityCalendar({ selected, onToggle, onSelectMany }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + PROJECT_MONTHS);
    return d;
  }, [today]);

  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Lunes = 0
    const offset = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  const isDisabled = (d: Date) => d < today || d > maxDate;

  const canPrev = cursor > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext =
    new Date(year, month + 1, 1) <=
    new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  const selectWeek = (rowIndex: number) => {
    const isos = weeks[rowIndex]
      .filter((d): d is Date => !!d && !isDisabled(d))
      .map(toISO);
    onSelectMany(isos, true);
  };

  const selectMonth = () => {
    const isos: string[] = [];
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      const date = new Date(year, month, d);
      if (!isDisabled(date)) isos.push(toISO(date));
    }
    onSelectMany(isos, true);
  };

  const clearMonth = () => {
    const isos: string[] = [];
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      isos.push(toISO(new Date(year, month, d)));
    }
    onSelectMany(isos, false);
  };

  return (
    <div className="card-soft p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => canPrev && setCursor(new Date(year, month - 1, 1))}
          disabled={!canPrev}
          className="btn-outline !p-2.5"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-lg font-extrabold text-foreground">
            {MONTH_NAMES[month]} {year}
          </p>
          <p className="text-xs text-muted-foreground">
            Mes {Math.round((cursor.getTime() - new Date(today.getFullYear(), today.getMonth(), 1).getTime()) / (1000 * 60 * 60 * 24 * 30.4)) + 1} de {PROJECT_MONTHS}
          </p>
        </div>
        <button
          type="button"
          onClick={() => canNext && setCursor(new Date(year, month + 1, 1))}
          disabled={!canNext}
          className="btn-outline !p-2.5"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={selectMonth} className="btn-outline !py-1.5 !text-xs">
          Mes completo
        </button>
        <button type="button" onClick={clearMonth} className="btn-outline !py-1.5 !text-xs">
          Limpiar mes
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.map((row, ri) =>
          row.map((d, ci) => {
            if (!d) return <div key={`${ri}-${ci}`} />;
            const iso = toISO(d);
            const disabled = isDisabled(d);
            const isSel = selected.has(iso);
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(iso)}
                className={[
                  "flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition sm:h-11",
                  disabled
                    ? "cursor-not-allowed text-muted-foreground/40"
                    : isSel
                      ? "bg-success text-success-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-accent/40",
                ].join(" ")}
                aria-pressed={isSel}
                aria-label={`${d.getDate()} de ${MONTH_NAMES[month]}`}
              >
                {d.getDate()}
              </button>
            );
          }),
        )}
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">
          Seleccionar semana completa:
        </p>
        <div className="flex flex-wrap gap-2">
          {weeks.map((row, i) => {
            const firstDay = row.find((d) => !!d);
            if (!firstDay) return null;
            return (
              <button
                key={i}
                type="button"
                onClick={() => selectWeek(i)}
                className="btn-outline !py-1 !text-xs"
              >
                Semana {i + 1} ({firstDay.getDate()}+)
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
