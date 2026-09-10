import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const filtersSchema = z.object({
  searchTerm: z.string().max(120).default(""),
  localityFilter: z.string().max(120).default(""),
  categoryFilter: z.string().uuid().or(z.literal("")).default(""),
  availabilityFrom: z.string().date().nullable().default(null),
  availabilityTo: z.string().date().nullable().default(null),
  includeSpecificAvailability: z.boolean().default(true),
});

export const getAdminVolunteers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => filtersSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isStaff, error: roleError } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (roleError) throw roleError;
    if (!isStaff) throw new Error("No tenés permisos para consultar voluntarios");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const useInnerAvailability = Boolean(data.availabilityFrom && data.availabilityTo);
    const useInnerSkills = Boolean(data.categoryFilter);

    let query = supabaseAdmin
      .from("profiles")
      .select(`
        *,
        volunteer_skills${useInnerSkills ? "!inner" : ""} (
          id,
          category_id,
          skill_level,
          years_experience,
          description,
          work_categories (id, name, color, icon)
        ),
        availability${useInnerAvailability ? "!inner" : ""} (available_date, is_available),
        accommodation_requests (
          id,
          needs_accommodation,
          is_fulfilled,
          locality_origin,
          dates_needed_start,
          dates_needed_end,
          special_requirements
        ),
        calendar_assignments (
          id,
          assignment_date,
          status,
          work_categories (name, color, icon)
        )
      `)
      .order("created_at", { ascending: false });

    if (data.searchTerm) query = query.ilike("full_name", `%${data.searchTerm}%`);
    if (data.localityFilter) query = query.ilike("locality", `%${data.localityFilter}%`);
    if (data.categoryFilter) query = query.eq("volunteer_skills.category_id", data.categoryFilter);
    if (data.includeSpecificAvailability) query = query.eq("availability.is_available", true);
    if (data.availabilityFrom && data.availabilityTo) {
      query = query
        .gte("availability.available_date", data.availabilityFrom)
        .lte("availability.available_date", data.availabilityTo);
    }

    const { data: volunteers, error } = await query;
    if (error) throw new Error(`No se pudieron cargar los voluntarios: ${error.message}`);

    const volunteerIds = (volunteers ?? []).map((volunteer) => volunteer.id);
    if (volunteerIds.length === 0) return [];

    const { data: flexibleAvailability, error: flexibleError } = await supabaseAdmin
      .from("flexible_availability")
      .select(`
        id,
        volunteer_id,
        frequency_type,
        max_occurrences,
        start_date,
        end_date,
        preferred_days,
        is_any_day,
        preferred_shift,
        notes,
        is_active
      `)
      .in("volunteer_id", volunteerIds);

    if (flexibleError) {
      throw new Error(`No se pudo cargar la disponibilidad flexible: ${flexibleError.message}`);
    }

    const flexibleByVolunteer = new Map<string, typeof flexibleAvailability>();
    for (const rule of flexibleAvailability ?? []) {
      const current = flexibleByVolunteer.get(rule.volunteer_id) ?? [];
      current.push(rule);
      flexibleByVolunteer.set(rule.volunteer_id, current);
    }

    return (volunteers ?? []).map((volunteer) => ({
      ...volunteer,
      flexible_availability: flexibleByVolunteer.get(volunteer.id) ?? [],
    }));
  });