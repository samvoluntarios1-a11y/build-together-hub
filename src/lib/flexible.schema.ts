import { z } from "zod";

export const flexibleRuleSchema = z.object({
  frequency_type: z.enum(["weekly", "monthly", "unlimited"]),
  max_occurrences: z.number().int().min(1).max(31).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  preferred_days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  is_any_day: z.boolean().default(false),
  preferred_shift: z.enum(["manana", "tarde", "completo"]).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type FlexibleRuleInput = z.infer<typeof flexibleRuleSchema>;

/** Valida coherencia y normaliza los valores antes de guardar. */
export function normalizeFlexibleRule(input: FlexibleRuleInput) {
  const isAnyDay = !!input.is_any_day;
  const days = isAnyDay ? [] : (input.preferred_days ?? []);

  if (!isAnyDay && days.length === 0) {
    throw new Error(
      "Elegí al menos un día de la semana o marcá 'cualquier día'.",
    );
  }
  if (input.frequency_type !== "unlimited" && !input.max_occurrences) {
    throw new Error("Indicá cuántos días podés colaborar en ese período.");
  }
  if (
    input.start_date &&
    input.end_date &&
    input.end_date < input.start_date
  ) {
    throw new Error("La fecha de fin debe ser posterior a la de inicio.");
  }

  return {
    frequency_type: input.frequency_type,
    max_occurrences:
      input.frequency_type === "unlimited"
        ? null
        : (input.max_occurrences ?? 1),
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    preferred_days: days,
    is_any_day: isAnyDay,
    preferred_shift: input.preferred_shift || null,
    notes: input.notes?.trim() || null,
    is_active: true,
  };
}
