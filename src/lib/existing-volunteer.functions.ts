import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const identitySchema = z.object({
  volunteer_number: z.string().min(1),
  full_name: z.string().optional().default(""),
  locality: z.string().optional().default(""),
});

const skillSchema = z.object({
  category_id: z.string().uuid(),
  skill_level: z.string(),
  years_experience: z.number().min(0).max(50),
  description: z.string().optional(),
});

const updateSchema = identitySchema.extend({
  dates: z.array(z.string()).min(1),
  edited_skills: z.boolean().default(false),
  skills: z.array(skillSchema).max(3).optional(),
  needs_accommodation: z.boolean(),
  locality_origin: z.string().optional(),
  dates_needed_start: z.string().optional(),
  dates_needed_end: z.string().optional(),
  special_requirements: z.string().optional(),
});

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export const checkVolunteerRegistrationStatus = createServerFn({ method: "POST" })
  .inputValidator((data) => identitySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, locality, volunteer_number")
      .eq("volunteer_number", data.volunteer_number.trim())
      .maybeSingle();

    if (error) {
      console.error("CHECK_VOLUNTEER_ERROR:", error);
      return { exists: false as const, matched: false, error: "No pudimos verificar el número. Intentá de nuevo." };
    }

    if (!profile) return { exists: false as const, matched: false };

    // La identificación es únicamente por número de voluntario.
    // El nombre y la localidad pueden cambiar y se actualizan al enviar.

    const [{ data: skills }, { data: accommodation }] = await Promise.all([
      supabaseAdmin
        .from("volunteer_skills")
        .select("category_id, skill_level, years_experience, description")
        .eq("volunteer_id", profile.id),
      supabaseAdmin
        .from("accommodation_requests")
        .select(
          "needs_accommodation, locality_origin, dates_needed_start, dates_needed_end, special_requirements",
        )
        .eq("volunteer_id", profile.id)
        .maybeSingle(),
    ]);

    return {
      exists: true as const,
      matched: true,
      profileId: profile.id,
      volunteer: {
        volunteer_number: profile.volunteer_number,
        full_name: profile.full_name,
        locality: profile.locality,
      },
      skills: skills ?? [],
      accommodation: accommodation ?? null,
    };
  });

export const updateExistingVolunteerAvailability = createServerFn({ method: "POST" })
  .inputValidator((data) => updateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, locality")
        .eq("volunteer_number", data.volunteer_number.trim())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        return { success: false as const, code: "NOT_FOUND", error: "No encontramos ese número de voluntario." };
      }

      const volunteerId = profile.id;

      // El número de voluntario manda: si cambió el nombre o la localidad, se actualizan.
      const newName = data.full_name.trim();
      const newLocality = data.locality.trim();
      if (
        (newName && normalize(newName) !== normalize(profile.full_name)) ||
        (newLocality && normalize(newLocality) !== normalize(profile.locality))
      ) {
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name: newName || profile.full_name,
            locality: newLocality || profile.locality,
          })
          .eq("id", volunteerId);
      }

      // 1. Fechas: sólo futuras y sin duplicados
      const today = new Date().toISOString().slice(0, 10);
      const requested = Array.from(new Set(data.dates.filter((d) => d >= today))).sort();

      const { data: existingDates, error: datesError } = await supabaseAdmin
        .from("availability")
        .select("available_date")
        .eq("volunteer_id", volunteerId)
        .in("available_date", requested);
      if (datesError) throw datesError;

      const already = new Set((existingDates ?? []).map((r) => r.available_date));
      const toInsert = requested.filter((d) => !already.has(d));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabaseAdmin.from("availability").insert(
          toInsert.map((d) => {
            const dt = new Date(d + "T00:00:00");
            return {
              volunteer_id: volunteerId,
              available_date: d,
              is_available: true,
              month: dt.getMonth() + 1,
              year: dt.getFullYear(),
            };
          }),
        );
        if (insertError) throw insertError;
      }

      // 2. Habilidades (sólo si el voluntario decidió editarlas)
      let skillsUpdated = false;
      if (data.edited_skills && data.skills && data.skills.length > 0) {
        const { data: oldSkills } = await supabaseAdmin
          .from("volunteer_skills")
          .select("category_id, skill_level, years_experience, description")
          .eq("volunteer_id", volunteerId);

        const { error: delError } = await supabaseAdmin
          .from("volunteer_skills")
          .delete()
          .eq("volunteer_id", volunteerId);
        if (delError) throw delError;

        const { error: skillsError } = await supabaseAdmin.from("volunteer_skills").insert(
          data.skills.map((s) => ({
            volunteer_id: volunteerId,
            category_id: s.category_id,
            skill_level: s.skill_level,
            years_experience: s.years_experience,
            description: s.description?.trim() || null,
          })),
        );
        if (skillsError) throw skillsError;
        skillsUpdated = true;

        await supabaseAdmin.from("audit_logs").insert({
          action: "UPDATE_SKILLS_PUBLIC",
          table_name: "volunteer_skills",
          record_id: volunteerId,
          old_value: oldSkills ?? null,
          new_value: data.skills,
        });
      }

      // 3. Alojamiento (upsert por voluntario)
      const { data: existingAcc } = await supabaseAdmin
        .from("accommodation_requests")
        .select("id")
        .eq("volunteer_id", volunteerId)
        .maybeSingle();

      const accPayload = {
        volunteer_id: volunteerId,
        needs_accommodation: data.needs_accommodation,
        locality_origin: data.locality_origin?.trim() || null,
        dates_needed_start: data.dates_needed_start || null,
        dates_needed_end: data.dates_needed_end || null,
        special_requirements: data.special_requirements?.trim() || null,
      };

      if (existingAcc) {
        const { error: accError } = await supabaseAdmin
          .from("accommodation_requests")
          .update(accPayload)
          .eq("id", existingAcc.id);
        if (accError) throw accError;
      } else if (data.needs_accommodation) {
        const { error: accError } = await supabaseAdmin
          .from("accommodation_requests")
          .insert(accPayload);
        if (accError) throw accError;
      }

      return {
        success: true as const,
        volunteer_number: data.volunteer_number.trim(),
        addedDates: toInsert,
        skippedDates: requested.filter((d) => already.has(d)),
        skillsUpdated,
      };
    } catch (err: any) {
      console.error("UPDATE_AVAILABILITY_ERROR:", err);
      return {
        success: false as const,
        code: err.code,
        error: err.message || "Error interno al actualizar tu disponibilidad",
      };
    }
  });
