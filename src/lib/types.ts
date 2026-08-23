export type SkillLevel = "primaria" | "secundaria" | "basica";
export type AppRole = "admin" | "coordinator" | "volunteer";
export type AssignmentStatus =
  | "assigned"
  | "confirmed"
  | "cancelled"
  | "completed";

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: "Asignado",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado"
};

export interface WorkCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryLite {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface SkillEmbed {
  id: string;
  category_id: string;
  skill_level: SkillLevel;
  years_experience: number;
  description: string | null;
  work_categories?: CategoryLite | null;
}

export interface AccommodationEmbed {
  id?: string;
  needs_accommodation: boolean;
  is_fulfilled: boolean;
  locality_origin: string | null;
  dates_needed_start: string | null;
  dates_needed_end: string | null;
  special_requirements: string | null;
}

export interface VolunteerRow {
  id: string;
  volunteer_number: string;
  full_name: string;
  locality: string;
  created_at: string;
  volunteer_skills: SkillEmbed[];
  availability: { available_date: string }[];
  accommodation_requests: AccommodationEmbed[];
  calendar_assignments?: AssignmentRow[];
}

export interface AssignmentRow {
  id: string;
  volunteer_id: string;
  category_id: string;
  assignment_date: string;
  skill_type: string;
  status: AssignmentStatus;
  notes: string | null;
  profiles?: {
    full_name: string;
    volunteer_number: string;
    locality: string;
    accommodation_requests?: AccommodationEmbed[];
    volunteer_skills?: SkillEmbed[];
  } | null;
  work_categories?: { name: string; color: string; icon: string } | null;
}

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  primaria: "Primaria",
  secundaria: "Secundaria",
  basica: "Básica",
};

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: "Asignado",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Completado",
};

export const MAX_SKILLS = 3;
export const PROJECT_MONTHS = 18;
