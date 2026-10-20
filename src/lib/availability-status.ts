import { localISO } from "./flexible";

export interface AvailabilityStatus {
  /** Specific dates from today onward. */
  current_dates: number;
  /** Active flexible rules not past their end date. */
  current_rules: number;
  /** The volunteer had availability, but none is current. */
  expired: boolean;
}

export function todayISO(): string {
  return localISO(new Date());
}

export function availabilityStatus(
  dates: { available_date: string; is_available?: boolean | null }[],
  rules: { is_active: boolean; end_date: string | null }[],
  today: string = todayISO(),
): AvailabilityStatus {
  const current_dates = dates.filter((d) => d.is_available !== false && d.available_date >= today).length;
  const current_rules = rules.filter((r) => r.is_active && (!r.end_date || r.end_date >= today)).length;
  const hadAny = dates.length > 0 || rules.length > 0;
  return { current_dates, current_rules, expired: hadAny && current_dates === 0 && current_rules === 0 };
}
