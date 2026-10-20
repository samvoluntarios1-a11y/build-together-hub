import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { accommodationPayload, currentAccommodation } from "./accommodation";
import { classifyRecommendations, type RecommendationCandidate } from "./assignment-recommendations";
import { type FlexibleRule } from "./flexible";

const rule: FlexibleRule = { id: "rule", frequency_type: "weekly", max_occurrences: 2, start_date: "2026-10-19", end_date: "2026-10-31", preferred_days: [1], is_any_day: false, preferred_shift: "completo", notes: null, is_active: true };
const candidate = (): RecommendationCandidate => ({ id: "volunteer", full_name: "Test", volunteer_number: "test", locality: "Mendoza", is_active: true, volunteer_skills: [{ category_id: "category", skill_level: "primaria", years_experience: 3, description: null }], availability: [], flexible_availability: [rule], accommodation_requests: [], calendar_assignments: [] });
const recommend = (v: RecommendationCandidate, date = "2026-10-19") => classifyRecommendations([v], date, "category");

describe("accommodation registration", () => {
  it("preserves all requested accommodation fields", () => {
    assert.deepEqual(accommodationPayload({ needs_accommodation: true, locality_origin: " San Rafael ", dates_needed_start: "2026-10-20", dates_needed_end: "2026-10-23", special_requirements: " Cama individual " }, "volunteer"), { volunteer_id: "volunteer", needs_accommodation: true, locality_origin: "San Rafael", dates_needed_start: "2026-10-20", dates_needed_end: "2026-10-23", special_requirements: "Cama individual" });
  });
  it("rejects an incomplete request before registration writes", () => {
    assert.throws(() => accommodationPayload({ needs_accommodation: true }, "volunteer"));
  });
  it("selects needed pending accommodation rather than an unrelated first row", () => {
    const rows = [{ needs_accommodation: false, is_fulfilled: false }, { needs_accommodation: true, is_fulfilled: false }];
    assert.equal(currentAccommodation(rows), rows[1]);
  });
});
describe("flexible recommendations", () => {
  it("puts a date-compatible skilled active volunteer in flexible", () => {
    assert.equal(recommend(candidate()).flexible[0]?.flexible_rule_id, "rule");
  });
  it("excludes inactive rules", () => {
    const v = candidate(); v.flexible_availability = [{ ...rule, is_active: false }];
    assert.equal(recommend(v).flexible.length, 0);
  });
  it("excludes dates outside the validity range", () => {
    assert.equal(recommend(candidate(), "2026-11-02").flexible.length, 0);
  });
  it("excludes non-preferred weekdays", () => {
    assert.equal(recommend(candidate(), "2026-10-20").flexible.length, 0);
  });
  it("requires the selected category skill", () => {
    const v = candidate(); v.volunteer_skills = [];
    assert.equal(recommend(v).flexible.length, 0);
  });
  it("ignores cancelled assignments and counts duplicate categories on one date once", () => {
    const v = candidate(); v.calendar_assignments = [
      { assignment_date: "2026-10-20", category_id: "one", status: "assigned" },
      { assignment_date: "2026-10-20", category_id: "two", status: "completed" },
      { assignment_date: "2026-10-21", category_id: "one", status: "cancelled" },
    ];
    assert.equal(recommend(v).flexible[0]?.quota_used, 1);
    assert.equal(recommend(v).flexible[0]?.quota_full, false);
  });
  it("keeps full quota candidates visible for explicit override", () => {
    const v = candidate(); v.flexible_availability = [{ ...rule, max_occurrences: 1 }]; v.calendar_assignments = [{ assignment_date: "2026-10-20", category_id: "one", status: "confirmed" }];
    assert.equal(recommend(v).flexible[0]?.quota_full, true);
  });
  it("prefers a compatible rule with remaining quota", () => {
    const v = candidate(); v.flexible_availability = [{ ...rule, max_occurrences: 1 }, { ...rule, id: "available", max_occurrences: 2 }]; v.calendar_assignments = [{ assignment_date: "2026-10-20", category_id: "one", status: "confirmed" }];
    assert.equal(recommend(v).flexible[0]?.flexible_rule_id, "available");
  });
  it("keeps exact availability in the confirmed group only", () => {
    const v = candidate(); v.availability = [{ available_date: "2026-10-19", is_available: true }];
    assert.equal(recommend(v).recommended.length, 1); assert.equal(recommend(v).flexible.length, 0);
  });
});