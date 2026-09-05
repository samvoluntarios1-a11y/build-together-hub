import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { flexibleRuleSchema, normalizeFlexibleRule } from "./flexible.schema";

const registrationSchema = z
  .object({
    volunteer_number: z.string().min(1),
    full_name: z.string().min(3),
    locality: z.string().min(1),
    skills: z.array(z.object({
      category_id: z.string().uuid(),
      skill_level: z.string(),
      years_experience: z.number().min(0),
      description: z.string().optional(),
    })).max(3),
    dates: z.array(z.string()).default([]),
    availability_mode: z.enum(["dates", "flexible"]).default("dates"),
    flexible: flexibleRuleSchema.nullable().optional(),
    needs_accommodation: z.boolean(),
    locality_origin: z.string().optional(),
    dates_needed_start: z.string().optional(),
    dates_needed_end: z.string().optional(),
    special_requirements: z.string().optional(),
  })
  .refine(
    (d) =>
      d.availability_mode === "flexible" ? !!d.flexible : d.dates.length > 0,
    { message: "Indicá tu disponibilidad" },
  );

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((data) => registrationSchema.parse(data))
  .handler(async ({ data }) => {
    // Importación dinámica para evitar que supabaseAdmin llegue al cliente
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      // 1. Verificar si el número de voluntario ya existe
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("volunteer_number", data.volunteer_number.trim())
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        return { 
          success: false, 
          error: "Este número ya está registrado",
          code: "DUPLICATE_NUMBER"
        };
      }

      // 2. Insertar Perfil
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          volunteer_number: data.volunteer_number.trim(),
          full_name: data.full_name.trim(),
          locality: data.locality.trim(),
        })
        .select("id")
        .single();

      if (profileError) throw profileError;
      const volunteerId = profile.id;

      // 3. Insertar Habilidades
      if (data.skills.length > 0) {
        const { error: skillsError } = await supabaseAdmin
          .from("volunteer_skills")
          .insert(data.skills.map(s => ({
            volunteer_id: volunteerId,
            category_id: s.category_id,
            skill_level: s.skill_level,
            years_experience: s.years_experience,
            description: s.description?.trim() || null,
          })));
        if (skillsError) throw skillsError;
      }

      // 4. Insertar Disponibilidad (fechas específicas o regla flexible)
      if (data.availability_mode === "flexible" && data.flexible) {
        const rule = normalizeFlexibleRule(data.flexible);
        const { error: flexError } = await supabaseAdmin
          .from("flexible_availability")
          .insert({ ...rule, volunteer_id: volunteerId });
        if (flexError) throw flexError;
      } else {
        const { error: availError } = await supabaseAdmin
          .from("availability")
          .insert(data.dates.map(d => {
            const dt = new Date(d + "T00:00:00");
            return {
              volunteer_id: volunteerId,
              available_date: d,
              is_available: true,
              month: dt.getMonth() + 1,
              year: dt.getFullYear(),
            };
          }));
        if (availError) throw availError;
      }


      // 5. Alojamiento
      if (data.needs_accommodation) {
        const { error: accError } = await supabaseAdmin
          .from("accommodation_requests")
          .insert({
            volunteer_id: volunteerId,
            needs_accommodation: true,
            locality_origin: data.locality_origin?.trim() || null,
            dates_needed_start: data.dates_needed_start || null,
            dates_needed_end: data.dates_needed_end || null,
            special_requirements: data.special_requirements?.trim() || null,
          });
        if (accError) throw accError;
      }

      return { 
        success: true, 
        volunteerId,
        volunteer_number: data.volunteer_number.trim()
      };

    } catch (err: any) {
      console.error("SERVER_REGISTRATION_ERROR:", err);
      return { 
        success: false, 
        error: err.message || "Error interno al procesar el registro",
        details: err.details,
        code: err.code
      };
    }
  });
