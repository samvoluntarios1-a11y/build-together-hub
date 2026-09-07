import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type AssignmentStatus, type SkillLevel } from "./types";
import {
  ruleCoversDate,
  quotaWindow,
  toFlexibleRule,
  type FlexibleRule,
} from "./flexible";

const assignmentSchema = z.object({
  volunteer_id: z.string().uuid(),
  category_id: z.string().uuid(),
  assignment_date: z.string(),
  notes: z.string().optional().nullable(),
  status: z.enum(["assigned", "confirmed", "cancelled", "completed"]).default("assigned"),
  availability_source: z.enum(["specific_date", "flexible_rule", "manual"]).optional(),
  flexible_rule_id: z.string().uuid().nullable().optional(),
  is_override: z.boolean().optional(),
  override_reason: z.string().nullable().optional(),
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

    // 1. Voluntarios con la habilidad en esa categoría
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
        flexible_availability (
          id,
          frequency_type,
          max_occurrences,
          start_date,
          end_date,
          preferred_days,
          is_any_day,
          preferred_shift,
          notes,
          is_active
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

    // 2. Clasificar en tres grupos
    const recommended: any[] = [];
    const flexible: any[] = [];
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

      // Excluir si ya está asignado a ESTA categoría en ESTA fecha
      if (alreadyAssigned) return;

      const otherAssignment = v.calendar_assignments?.find(
        (a: any) => a.assignment_date === date
      );

      // Regla flexible activa que cubra la fecha
      const rules: FlexibleRule[] = (v.flexible_availability ?? [])
        .map((r: any) => toFlexibleRule(r))
        .filter((r: FlexibleRule) => r.is_active);
      const rule = rules.find((r) => ruleCoversDate(r, date)) ?? null;

      let quotaUsed = 0;
      let quotaMax: number | null = null;
      let quotaFull = false;
      if (rule) {
        const win = quotaWindow(rule, date);
        if (win) {
          quotaMax = rule.max_occurrences ?? 1;
          quotaUsed = (v.calendar_assignments ?? []).filter(
            (a: any) => a.assignment_date >= win.from && a.assignment_date <= win.to
          ).length;
          quotaFull = quotaUsed >= (quotaMax ?? 1);
        }
      }

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
        other_assignment_info: otherAssignment ? { category_id: otherAssignment.category_id } : null,
        flexible_rule: rule,
        flexible_rule_id: rule?.id ?? null,
        quota_used: quotaUsed,
        quota_max: quotaMax,
        quota_full: quotaFull,
      };

      if (isAvailableExact) {
        recommended.push(volunteerInfo);
      } else if (rule) {
        flexible.push(volunteerInfo);
      } else {
        others.push(volunteerInfo);
      }
    });

    // 3. Ordenar
    const levelWeight: Record<string, number> = { primaria: 3, secundaria: 2, basica: 1 };
    const byLevel = (a: any, b: any) => {
      const weightA = levelWeight[a.skill_level] || 0;
      const weightB = levelWeight[b.skill_level] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return b.years_experience - a.years_experience;
    };
    recommended.sort(byLevel);
    flexible.sort((a, b) => {
      if (a.quota_full !== b.quota_full) return a.quota_full ? 1 : -1;
      return byLevel(a, b);
    });

    return { recommended, flexible, others };
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
            status: assignment.status,
            availability_source: assignment.availability_source ?? "specific_date",
            flexible_rule_id: assignment.flexible_rule_id ?? null,
            is_override: assignment.is_override ?? false,
            override_reason: assignment.override_reason ?? null
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

    const dbUpdates: any = {};
    if (updates.assignment_date !== undefined) dbUpdates.assignment_date = updates.assignment_date;
    if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes ?? null;

    const { data: result, error } = await supabaseAdmin
      .from("calendar_assignments")
      .update(dbUpdates)
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
