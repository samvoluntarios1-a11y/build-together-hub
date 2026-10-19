import { z } from "zod";

export const accommodationFields = {
  needs_accommodation: z.boolean(),
  locality_origin: z.string().optional(),
  dates_needed_start: z.string().optional(),
  dates_needed_end: z.string().optional(),
  special_requirements: z.string().optional(),
};

export type AccommodationInput = z.infer<z.ZodObject<typeof accommodationFields>>;

export function accommodationPayload(data: AccommodationInput, volunteerId: string) {
  if (data.needs_accommodation && (!data.locality_origin?.trim() || !data.dates_needed_start || !data.dates_needed_end)) {
    throw new Error("Completá el origen y las fechas de alojamiento antes de enviar.");
  }
  if (data.needs_accommodation && data.dates_needed_start && data.dates_needed_end && data.dates_needed_end < data.dates_needed_start) {
    throw new Error("La fecha de fin del alojamiento debe ser posterior a la de inicio.");
  }
  return {
    volunteer_id: volunteerId,
    needs_accommodation: data.needs_accommodation,
    locality_origin: data.locality_origin?.trim() || null,
    dates_needed_start: data.dates_needed_start || null,
    dates_needed_end: data.dates_needed_end || null,
    special_requirements: data.special_requirements?.trim() || null,
  };
}

/** Do not assume the first relation row is the current pending request. */
export function currentAccommodation<T extends { needs_accommodation: boolean; is_fulfilled?: boolean }>(rows: T[] | null | undefined): T | undefined {
  return rows?.find((row) => row.needs_accommodation && !row.is_fulfilled)
    ?? rows?.find((row) => row.needs_accommodation)
    ?? rows?.[0];
}