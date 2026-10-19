import { ruleCoversDate, quotaWindow, toFlexibleRule, type FlexibleRule } from "./flexible";
import { currentAccommodation } from "./accommodation";

export interface RecommendationCandidate {
  id: string;
  full_name: string;
  volunteer_number: string;
  locality: string;
  is_active: boolean;
  volunteer_skills: { category_id: string; skill_level: string; years_experience: number; description: string | null }[];
  availability: { available_date: string; is_available: boolean }[];
  flexible_availability: FlexibleRule[];
  accommodation_requests: { needs_accommodation: boolean; is_fulfilled?: boolean }[];
  calendar_assignments: { assignment_date: string; category_id: string; status: string }[];
}

export function classifyRecommendations(volunteers: RecommendationCandidate[], date: string, categoryId: string) {
  const entries = volunteers.flatMap((v) => {
    const skill = v.volunteer_skills.find((s) => s.category_id === categoryId);
    if (!v.is_active || !skill) return [];
    const assignments = v.calendar_assignments.filter((a) => a.status !== "cancelled");
    if (assignments.some((a) => a.assignment_date === date && a.category_id === categoryId)) return [];
    const exact = v.availability.some((a) => a.available_date === date && a.is_available);
    // Quotas describe volunteer days per period, not rows/categories per day.
    const options = v.flexible_availability.map(toFlexibleRule).filter((r) => ruleCoversDate(r, date)).map((rule) => {
      const window = quotaWindow(rule, date);
      const used = window ? new Set(assignments.filter((a) => a.assignment_date >= window.from && a.assignment_date <= window.to).map((a) => a.assignment_date)).size : 0;
      const max = window ? rule.max_occurrences ?? 1 : null;
      return { rule, used, max, full: max !== null && used >= max };
    });
    const option = options.find((o) => !o.full) ?? options[0];
    const conflict = assignments.find((a) => a.assignment_date === date);
    return [{
      group: exact ? "recommended" : option ? "flexible" : "others",
      volunteer: {
        id: v.id, full_name: v.full_name, volunteer_number: v.volunteer_number, locality: v.locality,
        skill_level: skill.skill_level, years_experience: skill.years_experience, description: skill.description,
        needs_accommodation: currentAccommodation(v.accommodation_requests)?.needs_accommodation ?? false,
        other_assignment: Boolean(conflict), other_assignment_info: conflict ? { category_id: conflict.category_id } : null,
        flexible_rule: option?.rule ?? null, flexible_rule_id: option?.rule.id ?? null,
        quota_used: option?.used ?? 0, quota_max: option?.max ?? null, quota_full: option?.full ?? false,
      },
    }];
  });
  const weights: Record<string, number> = { primaria: 3, secundaria: 2, basica: 1 };
  const group = (name: string) => entries.filter((entry) => entry.group === name).map((entry) => entry.volunteer).sort((a, b) =>
    (name === "flexible" ? Number(a.quota_full) - Number(b.quota_full) : 0)
    || (weights[b.skill_level] ?? 0) - (weights[a.skill_level] ?? 0)
    || b.years_experience - a.years_experience);
  return { recommended: group("recommended"), flexible: group("flexible"), others: group("others") };
}