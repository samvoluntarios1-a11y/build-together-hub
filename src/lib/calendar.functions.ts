import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type AssignmentStatus, type SkillLevel } from "./types";

const assignmentSchema = z.object({
  volunteer_id: z.string().uuid(),
  category_id: z.string().uuid(),
  assignment_date: z.string(),
  notes: z.string().optional().nullable(),
  status: z.enum(["assigned", "confirmed", "cancelled", "completed"]).default("assigned"),
});

const bulkAssignmentSchema = z.object({
  assignments: z.array(assignmentSchema),
});

const searchRecommendationSchema = z.object({
  date: z.string(),
  categoryId: z.string().uuid(),
  searchTerm: z.string().optional(),
});

const updateAssignmentSchema = z.object({
  id: z.string().uuid(),
  assignment_date: z.string().optional(),
  category_id: z.string().uuid().optional(),
  status: z.enum(["assigned", "confirmed", "cancelled", "completed"]).optional(),
  notes: z.string().optional().nullable(),
});

export const getAssignmentRecommendations = createServerFn({ method: "GET" })
  .inputValidator((data) => searchRecommendationSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { date, categoryId, searchTerm } = data;

    // 1. Get volunteers with the skill in that category
    let query = supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        volunteer_number,
        locality,
        is_active,
        volunteer_skills!inner (
          category_id,
          skill_level,
          years_experience,
          description
        ),
        availability (
          available_date,
          is_available
        ),
        accommodation_requests (
          needs_accommodation
        ),
        calendar_assignments (
          assignment_date,
          category_id
        )
      `)
      .eq("is_active", true)
      .eq("volunteer_skills.category_id", categoryId);

    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,volunteer_number.ilike.%${searchTerm}%`);
    }

    const { data: volunteers, error } = await query;
    if (error) throw error;

    // 2. Process recommendations
    const recommended: any[] = [];
    const others: any[] = [];

    volunteers?.forEach((v: any) => {
      const skill = v.volunteer_skills.find((s: any) => s.category_id === categoryId);
      if (!skill) return;

      const isAvailableExact = v.availability?.some(
        (a: any) => a.available_date === date && a.is_available
      );

      const alreadyAssigned = v.calendar_assignments?.some(
        (a: any) => a.assignment_date === date && a.category_id === categoryId
      );

      // Exclude if already assigned to THIS category on THIS date
      if (alreadyAssigned) return;

      const otherAssignment = v.calendar_assignments?.find(
        (a: any) => a.assignment_date === date
      );

      const volunteerInfo = {
        id: v.id,
        full_name: v.full_name,
        volunteer_number: v.volunteer_number,
        locality: v.locality,
        skill_level: skill.skill_level,
        years_experience: skill.years_experience,
        description: skill.description,
        needs_accommodation: v.accommodation_requests?.[0]?.needs_accommodation || false,
        other_assignment: otherAssignment ? true : false,
        other_assignment_info: otherAssignment ? { category_id: otherAssignment.category_id } : null
      };

      if (isAvailableExact) {
        recommended.push(volunteerInfo);
      } else {
        others.push(volunteerInfo);
      }
    });

    // 3. Sort recommended
    const levelWeight: Record<string, number> = { primaria: 3, secundaria: 2, basica: 1 };
    recommended.sort((a, b) => {
      const weightA = levelWeight[a.skill_level] || 0;
      const weightB = levelWeight[b.skill_level] || 0;
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      return b.years_experience - a.years_experience;
    });

    return { recommended, others };
  });

export const createBulkAssignments = createServerFn({ method: "POST" })
  .inputValidator((data) => bulkAssignmentSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results = {
      successCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      errors: [] as string[]
    };

    for (const assignment of data.assignments) {
      try {
        // Check for duplicate
        const { data: existing } = await supabaseAdmin
          .from("calendar_assignments")
          .select("id")
          .eq("volunteer_id", assignment.volunteer_id)
          .eq("assignment_date", assignment.assignment_date)
          .eq("category_id", assignment.category_id)
          .maybeSingle();

        if (existing) {
          results.duplicateCount++;
          continue;
        }

        const { error } = await supabaseAdmin
          .from("calendar_assignments")
          .insert({
            volunteer_id: assignment.volunteer_id,
            category_id: assignment.category_id,
            assignment_date: assignment.assignment_date,
            notes: assignment.notes ?? null,
            status: assignment.status
          });

        if (error) throw error;
        results.successCount++;
      } catch (err: any) {
        results.errorCount++;
        results.errors.push(err.message);
      }
    }

    return results;
  });

export const updateAssignment = createServerFn({ method: "POST" })
  .inputValidator((data) => updateAssignmentSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...updates } = data;

    // If moving, check for duplicates
    if (updates.assignment_date || updates.category_id) {
      const { data: current } = await supabaseAdmin
        .from("calendar_assignments")
        .select("volunteer_id, assignment_date, category_id")
        .eq("id", id)
        .single();
      
      if (current) {
        const checkDate = updates.assignment_date || current.assignment_date;
        const checkCat = updates.category_id || current.category_id;

        const { data: existing } = await supabaseAdmin
          .from("calendar_assignments")
          .select("id")
          .eq("volunteer_id", current.volunteer_id)
          .eq("assignment_date", checkDate)
          .eq("category_id", checkCat)
          .neq("id", id)
          .maybeSingle();
        
        if (existing) {
          throw new Error("El voluntario ya tiene una asignación para esa fecha y categoría.");
        }
      }
    }

    const { data: result, error } = await supabaseAdmin
      .from("calendar_assignments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("calendar_assignments")
      .delete()
      .eq("id", data.id);

    if (error) throw error;
    return { success: true };
  });
