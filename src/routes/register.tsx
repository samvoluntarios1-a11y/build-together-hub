import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SuccessSearch } from "./registro-exitoso";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  CalendarDays,
  BedDouble,
  ClipboardCheck,
  Wrench,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Save,
  HardHat,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitRegistration } from "@/lib/registration.functions";
import {
  checkVolunteerRegistrationStatus,
  updateExistingVolunteerAvailability,
} from "@/lib/existing-volunteer.functions";
import { AvailabilityCalendar } from "@/components/register/AvailabilityCalendar";
import { CategoryIcon } from "@/lib/icons";
import { AppLogo } from "@/components/AppLogo";
import {
  MAX_SKILLS,
  SKILL_LEVEL_LABELS,
  type SkillLevel,
  type WorkCategory,
} from "@/lib/types";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Voluntarios LDC" },
      {
        name: "description",
        content: "Voluntarios LDC — Gestión de voluntarios para la construcción",
      },
      { property: "og:title", content: "Voluntarios LDC" },
      {
        property: "og:description",
        content: "Voluntarios LDC — Gestión de voluntarios para la construcción",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

interface SkillDraft {
  category_id: string;
  skill_level: SkillLevel;
  years_experience: number;
  description: string;
}

interface ExistingInfo {
  profileId: string;
  full_name: string;
  locality: string;
  skills: SkillDraft[];
  accommodation: {
    needs_accommodation: boolean;
    locality_origin: string | null;
    dates_needed_start: string | null;
    dates_needed_end: string | null;
    special_requirements: string | null;
  } | null;
}

interface Draft {
  volunteer_number: string;
  full_name: string;
  locality: string;
  skills: SkillDraft[];
  dates: string[];
  needs_accommodation: boolean;
  locality_origin: string;
  dates_needed_start: string;
  dates_needed_end: string;
  special_requirements: string;
}

interface StepErrors {
  volunteer_number?: string;
  full_name?: string;
  locality?: string;
  skills?: string;
  dates?: string;
  locality_origin?: string;
  dates_needed_start?: string;
  dates_needed_end?: string;
}

const EMPTY_DRAFT: Draft = {
  volunteer_number: "",
  full_name: "",
  locality: "",
  skills: [],
  dates: [],
  needs_accommodation: false,
  locality_origin: "",
  dates_needed_start: "",
  dates_needed_end: "",
  special_requirements: "",
};

const DRAFT_KEY = "voluntarios-ldc-draft-v1";
const STEPS = [
  { label: "Datos", icon: User },
  { label: "Habilidades", icon: HardHat },
  { label: "Disponibilidad", icon: CalendarDays },
  { label: "Alojamiento", icon: BedDouble },
  { label: "Revisión", icon: ClipboardCheck },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<StepErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [checkingNumber, setCheckingNumber] = useState(false);
  const [numberOk, setNumberOk] = useState<boolean | null>(null);
  const [skillForm, setSkillForm] = useState<SkillDraft | null>(null);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [existing, setExisting] = useState<ExistingInfo | null>(null);
  const [editSkills, setEditSkills] = useState(false);
  const restored = useRef(false);
  const isUpdate = existing !== null;

  const { data: categories } = useQuery({
    queryKey: ["work-categories-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_categories")
        .select("id, name, description, color, icon, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkCategory[];
    },
  });

  // Restaurar borrador (solo en cliente, después de montar)
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft>;
        setDraft({ ...EMPTY_DRAFT, ...parsed });
        toast.info("Recuperamos tu borrador guardado", {
          description: "Podés continuar donde lo dejaste.",
        });
      }
    } catch {
      /* borrador corrupto: ignorar */
    }
  }, []);

  // Autoguardado con debounce (y nunca más de 30s sin guardar)
  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setLastSaved(new Date());
      } catch {
        /* sin espacio: ignorar */
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [draft]);

  const selectedDates = useMemo(() => new Set(draft.dates), [draft.dates]);
  const usedCategories = useMemo(
    () => new Set(draft.skills.map((s) => s.category_id)),
    [draft.skills],
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key as keyof StepErrors];
      return next;
    });
  };

  async function checkNumber(num: string): Promise<boolean> {
    if (!num.trim()) return false;
    setCheckingNumber(true);
    try {
      const { data, error } = await supabase.rpc(
        "check_volunteer_number_available",
        { p_number: num.trim() },
      );
      if (error) throw error;
      setNumberOk(!!data);
      return !!data;
    } catch {
      // Si falla la verificación en línea, no bloqueamos: la restricción única de la base es el respaldo
      setNumberOk(null);
      return true;
    } finally {
      setCheckingNumber(false);
    }
  }

  /**
   * Detección por número de voluntario (identificador único).
   * El nombre y la localidad pueden cambiar: se actualizan al enviar.
   */
  async function detectVolunteer(): Promise<"new" | "update" | "incomplete"> {
    const num = draft.volunteer_number.trim();
    if (!num) return "incomplete";

    setCheckingNumber(true);
    try {
      const res = await checkVolunteerRegistrationStatus({
        data: {
          volunteer_number: num,
          full_name: draft.full_name.trim(),
          locality: draft.locality.trim(),
        },
      });

      if (!res.exists) {
        setExisting(null);
        setEditSkills(false);
        setNumberOk(true);
        return "new";
      }

      const skills = (res.skills ?? []).map((s) => ({
        category_id: s.category_id,
        skill_level: s.skill_level as SkillLevel,
        years_experience: s.years_experience,
        description: s.description ?? "",
      }));

      setExisting({
        profileId: res.profileId!,
        full_name: res.volunteer!.full_name,
        locality: res.volunteer!.locality,
        skills,
        accommodation: res.accommodation ?? null,
      });
      setEditSkills(false);
      setNumberOk(null);
      setDraft((d) => ({
        ...d,
        full_name: d.full_name.trim() || res.volunteer!.full_name,
        locality: d.locality.trim() || res.volunteer!.locality,
        skills: skills.length > 0 ? skills : d.skills,
        needs_accommodation: res.accommodation?.needs_accommodation ?? d.needs_accommodation,
        locality_origin: res.accommodation?.locality_origin ?? d.locality_origin,
        dates_needed_start: res.accommodation?.dates_needed_start ?? d.dates_needed_start,
        dates_needed_end: res.accommodation?.dates_needed_end ?? d.dates_needed_end,
        special_requirements: res.accommodation?.special_requirements ?? d.special_requirements,
      }));
      return "update";
    } catch {
      setNumberOk(null);
      return "incomplete";
    } finally {
      setCheckingNumber(false);
    }
  }


  function validateStep(s: number): boolean {
    const e: StepErrors = {};
    if (s === 0) {
      if (!draft.volunteer_number.trim())
        e.volunteer_number = "Ingresá tu número de voluntario";
      if (!draft.full_name.trim() || draft.full_name.trim().length < 3)
        e.full_name = "Ingresá tu nombre completo";
      if (!draft.locality.trim())
        e.locality = "Ingresá tu localidad (ej: Junín - Mendoza)";
      // El número de voluntario identifica: si ya existe, se actualiza el registro.

    }
    if (s === 1 && draft.skills.length === 0) {
      e.skills = "Agregá al menos una habilidad";
    }
    if (s === 2 && draft.dates.length === 0) {
      e.dates = "Seleccioná al menos 1 día disponible";
    }
    if (s === 3 && draft.needs_accommodation) {
      if (!draft.locality_origin.trim())
        e.locality_origin = "Contanos desde dónde venís";
      if (!draft.dates_needed_start)
        e.dates_needed_start = "Indicá desde qué fecha necesitás alojamiento";
      if (!draft.dates_needed_end)
        e.dates_needed_end = "Indicá hasta qué fecha";
      if (
        draft.dates_needed_start &&
        draft.dates_needed_end &&
        draft.dates_needed_end < draft.dates_needed_start
      )
        e.dates_needed_end = "La fecha de fin debe ser posterior a la de inicio";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function next() {
    if (step === 0) {
      const ok = validateStep(0);
      if (!ok) return;
      const result = await detectVolunteer();
      if (result === "incomplete") {
        setErrors({
          volunteer_number: "No pudimos verificar tu número. Intentá de nuevo.",
        });
        return;
      }
      if (result === "update") {
        toast.success("¡Te encontramos!", {
          description: "Cargá tu nueva disponibilidad. Tus habilidades quedaron guardadas.",
        });
      }

    } else if (!validateStep(step)) {
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function toggleDate(iso: string) {
    const nextSet = new Set(selectedDates);
    if (nextSet.has(iso)) nextSet.delete(iso);
    else nextSet.add(iso);
    set("dates", Array.from(nextSet).sort());
  }

  function selectMany(isos: string[], value: boolean) {
    const nextSet = new Set(selectedDates);
    for (const iso of isos) {
      if (value) nextSet.add(iso);
      else nextSet.delete(iso);
    }
    set("dates", Array.from(nextSet).sort());
  }

  function applyRange() {
    if (!rangeFrom || !rangeTo) {
      toast.error("Elegí fecha de inicio y de fin para el rango");
      return;
    }
    if (rangeTo < rangeFrom) {
      toast.error("La fecha de fin debe ser posterior a la de inicio");
      return;
    }
    const isos: string[] = [];
    const start = new Date(rangeFrom + "T00:00:00");
    const end = new Date(rangeTo + "T00:00:00");
    const max = new Date();
    max.setMonth(max.getMonth() + 24); // Rango extendido para seguridad
    const today = new Date(todayISO() + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d >= today && d <= max) isos.push(toLocalISO(d));
      if (isos.length > 600) break;
    }
    selectMany(isos, true);
    toast.success(`Se agregaron ${isos.length} días del rango`);
  }

  function addSkill() {
    if (!skillForm) return;
    if (!skillForm.category_id) {
      toast.error("Elegí una categoría de trabajo");
      return;
    }
    if (usedCategories.has(skillForm.category_id)) {
      toast.error("Ya agregaste esa categoría");
      return;
    }
    const years = Math.max(0, Math.min(50, Math.floor(skillForm.years_experience || 0)));
    set("skills", [
      ...draft.skills,
      { ...skillForm, years_experience: years, description: skillForm.description.slice(0, 200) },
    ]);
    setSkillForm(null);
  }

  async function submit() {
    if (!confirm) {
      toast.error("Confirmá que todos los datos son correctos");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitRegistration({
        data: {
          volunteer_number: draft.volunteer_number,
          full_name: draft.full_name,
          locality: draft.locality,
          skills: draft.skills,
          dates: draft.dates,
          needs_accommodation: draft.needs_accommodation,
          locality_origin: draft.locality_origin,
          dates_needed_start: draft.dates_needed_start,
          dates_needed_end: draft.dates_needed_end,
          special_requirements: draft.special_requirements,
        }
      });

      if (!result.success) {
        if (result.code === "DUPLICATE_NUMBER") {
          setStep(0);
          setErrors({
            volunteer_number: "Este número ya está registrado, por favor verificá tu número",
          });
          toast.error("Número duplicado", {
            description: "El número de voluntario ingresado ya existe en el sistema.",
          });
        } else {
          console.error("REGISTRATION_SUBMIT_ERROR:", result);
          toast.error("Error al enviar el registro", {
            description: result.error || "Ocurrió un error inesperado. Tus datos siguen guardados.",
          });
        }
        return;
      }

      localStorage.removeItem(DRAFT_KEY);
      navigate({
        to: "/registro-exitoso",
        search: {
          n: draft.volunteer_number.trim(),
          nombre: draft.full_name.trim(),
          dias: draft.dates.length,
        } as SuccessSearch,
      });
    } catch (err: any) {
      console.error("DEBUG_REGISTER_FATAL_ERROR:", err);
      toast.error("Error de conexión", {
        description: "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const catById = useMemo(() => {
    const map = new Map<string, WorkCategory>();
    for (const c of categories ?? []) map.set(c.id, c);
    return map;
  }, [categories]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground no-print">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/">
            <AppLogo variant="default" iconClassName="h-5 w-5" textClassName="font-extrabold tracking-tight" />
          </Link>
          {lastSaved && (
            <span className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
              <Save className="h-3.5 w-3.5" />
              Borrador guardado{" "}
              {lastSaved.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </header>

      {/* Barra de progreso */}
      <div className="border-b border-border bg-card no-print">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <ol className="flex items-center justify-between gap-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.label} className="flex flex-1 flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition",
                      done
                        ? "border-success bg-success text-success-foreground"
                        : active
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card text-muted-foreground",
                    ].join(" ")}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-4.5 w-4.5" />}
                  </button>
                  <span
                    className={`text-[11px] font-semibold sm:text-xs ${active ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* PASO 1 — DATOS PERSONALES */}
        {step === 0 && (
          <section className="card-soft p-6 sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight">Tus datos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Usamos tu número de voluntario para identificarte durante toda la estadía.
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="volunteer_number" className="mb-1.5 block text-sm font-semibold">
                  Número de voluntario *
                </label>
                <div className="relative">
                  <input
                    id="volunteer_number"
                    className="input-field"
                    placeholder="Ej: 1042"
                    value={draft.volunteer_number}
                    onChange={(e) => {
                      set("volunteer_number", e.target.value);
                      setNumberOk(null);
                    }}
                    onBlur={() => draft.volunteer_number.trim() && checkNumber(draft.volunteer_number)}
                  />
                  {checkingNumber && (
                    <Loader2 className="absolute right-4 top-3.5 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  {numberOk === true && (
                    <CheckCircle2 className="absolute right-4 top-3.5 h-5 w-5 text-success" />
                  )}
                </div>
                {errors.volunteer_number && (
                  <p className="mt-1 text-sm text-destructive">{errors.volunteer_number}</p>
                )}
                {numberOk === true && (
                  <p className="mt-1 text-sm text-success">Número disponible ✓</p>
                )}
              </div>
              <div>
                <label htmlFor="full_name" className="mb-1.5 block text-sm font-semibold">
                  Nombre completo *
                </label>
                <input
                  id="full_name"
                  className="input-field"
                  placeholder="Ej: María González"
                  value={draft.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-destructive">{errors.full_name}</p>
                )}
              </div>
              <div>
                <label htmlFor="locality" className="mb-1.5 block text-sm font-semibold">
                  Localidad *
                </label>
                <input
                  id="locality"
                  className="input-field"
                  placeholder="Ej: Junín - Mendoza"
                  value={draft.locality}
                  onChange={(e) => set("locality", e.target.value)}
                />
                {errors.locality && (
                  <p className="mt-1 text-sm text-destructive">{errors.locality}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* PASO 2 — HABILIDADES */}
        {step === 1 && (
          <section className="card-soft p-6 sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight">Tus habilidades</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Agregá hasta {MAX_SKILLS} oficios. Así te asignamos donde más ayudás.
            </p>

            <div className="mt-6 space-y-3">
              {draft.skills.map((s, i) => {
                const cat = catById.get(s.category_id);
                return (
                  <div key={s.category_id} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4">
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-card"
                      style={{ backgroundColor: cat?.color ?? "#1a3a5c" }}
                    >
                      <CategoryIcon name={cat?.icon ?? "hard-hat"} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{cat?.name ?? "Categoría"}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            s.skill_level === "primaria"
                              ? "bg-success/15 text-success"
                              : s.skill_level === "secundaria"
                                ? "bg-warning/20 text-warning-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {SKILL_LEVEL_LABELS[s.skill_level]}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {s.years_experience} {s.years_experience === 1 ? "año" : "años"} de experiencia
                        </span>
                      </div>
                      {s.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => set("skills", draft.skills.filter((_, j) => j !== i))}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar habilidad"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                );
              })}
              {errors.skills && <p className="text-sm text-destructive">{errors.skills}</p>}
            </div>

            {skillForm ? (
              <div className="mt-4 rounded-xl border-2 border-accent/50 bg-accent/5 p-4 sm:p-5">
                <h3 className="font-bold">Nueva habilidad</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Categoría de trabajo *</label>
                    <select
                      className="select-field"
                      value={skillForm.category_id}
                      onChange={(e) => setSkillForm({ ...skillForm, category_id: e.target.value })}
                    >
                      <option value="">Elegí una categoría…</option>
                      {(categories ?? [])
                        .filter((c) => !usedCategories.has(c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Nivel de habilidad *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSkillForm({ ...skillForm, skill_level: lvl })}
                          className={[
                            "rounded-xl border-2 px-2 py-2.5 text-sm font-bold transition",
                            skillForm.skill_level === lvl
                              ? "border-accent bg-accent/15 text-foreground"
                              : "border-border bg-card text-muted-foreground",
                          ].join(" ")}
                        >
                          {SKILL_LEVEL_LABELS[lvl]}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Primaria: lo que mejor sabés · Secundaria: lo sabés bien · Básica: lo mínimo
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Años de experiencia (0 a 50)</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      className="input-field"
                      value={skillForm.years_experience}
                      onChange={(e) =>
                        setSkillForm({ ...skillForm, years_experience: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">
                      Descripción breve <span className="font-normal text-muted-foreground">(opcional)</span>
                    </label>
                    <textarea
                      className="textarea-field"
                      rows={2}
                      maxLength={200}
                      placeholder='Ej: "3 años instalando cableado monofásico"'
                      value={skillForm.description}
                      onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                    />
                    <p className="mt-0.5 text-right text-xs text-muted-foreground">
                      {skillForm.description.length}/200
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={addSkill} className="btn-navy flex-1">
                      Agregar
                    </button>
                    <button type="button" onClick={() => setSkillForm(null)} className="btn-outline">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={draft.skills.length >= MAX_SKILLS}
                onClick={() =>
                  setSkillForm({ category_id: "", skill_level: "primaria", years_experience: 0, description: "" })
                }
                className="btn-outline mt-4 w-full border-dashed !py-4"
              >
                <Plus className="h-5 w-5" />
                Agregar habilidad ({draft.skills.length}/{MAX_SKILLS})
              </button>
            )}
          </section>
        )}

        {/* PASO 3 — DISPONIBILIDAD */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="card-soft p-6 sm:p-8">
              <h1 className="text-2xl font-extrabold tracking-tight">¿Qué días podés venir?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Tocá los días del calendario en los que estás disponible (se marcan en verde).
                Podés navegar el calendario y marcar tus días disponibles.
              </p>

              <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-sm font-semibold">Seleccionar un rango de fechas</p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Desde</label>
                    <input
                      type="date"
                      className="input-field !h-10 w-40"
                      min={todayISO()}
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Hasta</label>
                    <input
                      type="date"
                      className="input-field !h-10 w-40"
                      min={rangeFrom || todayISO()}
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                    />
                  </div>
                  <button type="button" onClick={applyRange} className="btn-outline !py-2">
                    Aplicar rango
                  </button>
                </div>
              </div>
            </div>

            <AvailabilityCalendar
              selected={selectedDates}
              onToggle={toggleDate}
              onSelectMany={selectMany}
            />

            <div className="card-soft flex items-center justify-between p-4">
              <p className="font-semibold">
                Seleccionaste{" "}
                <span className="text-lg font-extrabold text-primary">{draft.dates.length}</span>{" "}
                {draft.dates.length === 1 ? "día disponible" : "días disponibles"}
              </p>
              {draft.dates.length > 0 && (
                <button
                  type="button"
                  className="text-sm font-semibold text-destructive hover:underline"
                  onClick={() => set("dates", [])}
                >
                  Borrar todos
                </button>
              )}
            </div>
            {errors.dates && <p className="text-sm text-destructive">{errors.dates}</p>}
          </section>
        )}

        {/* PASO 4 — ALOJAMIENTO */}
        {step === 3 && (
          <section className="card-soft p-6 sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight">Alojamiento</h1>
            <p className="mt-4 text-lg font-semibold">
              ¿Necesitás alojamiento durante los días de voluntariado?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { value: true, label: "Sí, necesito", icon: BedDouble },
                { value: false, label: "No, gracias", icon: CheckCircle2 },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => set("needs_accommodation", opt.value)}
                  className={[
                    "flex flex-col items-center gap-2 rounded-2xl border-2 p-6 font-bold transition",
                    draft.needs_accommodation === opt.value
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-card text-muted-foreground",
                  ].join(" ")}
                  aria-pressed={draft.needs_accommodation === opt.value}
                >
                  <opt.icon className="h-8 w-8" />
                  {opt.label}
                </button>
              ))}
            </div>

            {draft.needs_accommodation && (
              <div className="mt-6 space-y-5 rounded-xl border border-border bg-secondary/40 p-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    ¿Desde qué localidad venís? *
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: San Rafael - Mendoza"
                    value={draft.locality_origin}
                    onChange={(e) => set("locality_origin", e.target.value)}
                  />
                  {errors.locality_origin && (
                    <p className="mt-1 text-sm text-destructive">{errors.locality_origin}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Desde qué fecha *</label>
                    <input
                      type="date"
                      className="input-field"
                      min={todayISO()}
                      value={draft.dates_needed_start}
                      onChange={(e) => set("dates_needed_start", e.target.value)}
                    />
                    {errors.dates_needed_start && (
                      <p className="mt-1 text-sm text-destructive">{errors.dates_needed_start}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Hasta qué fecha *</label>
                    <input
                      type="date"
                      className="input-field"
                      min={draft.dates_needed_start || todayISO()}
                      value={draft.dates_needed_end}
                      onChange={(e) => set("dates_needed_end", e.target.value)}
                    />
                    {errors.dates_needed_end && (
                      <p className="mt-1 text-sm text-destructive">{errors.dates_needed_end}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Requisitos especiales <span className="font-normal text-muted-foreground">(opcional)</span>
                  </label>
                  <textarea
                    className="textarea-field"
                    rows={3}
                    placeholder='Ej: "Necesito cama, soy alérgico a los gatos…"'
                    value={draft.special_requirements}
                    onChange={(e) => set("special_requirements", e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* PASO 5 — REVISIÓN */}
        {step === 4 && (
          <section className="space-y-4">
            <div className="card-soft p-6 sm:p-8">
              <h1 className="text-2xl font-extrabold tracking-tight">Revisá tu registro</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Verificá que esté todo correcto antes de enviar.
              </p>
            </div>

            <div className="card-soft p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Datos personales</h3>
                <button type="button" onClick={() => setStep(0)} className="text-sm font-semibold text-primary hover:underline">
                  Editar
                </button>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">N° voluntario</dt>
                  <dd className="font-bold">#{draft.volunteer_number}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Nombre</dt>
                  <dd className="font-bold">{draft.full_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Localidad</dt>
                  <dd className="font-bold">{draft.locality}</dd>
                </div>
              </dl>
            </div>

            <div className="card-soft p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Habilidades ({draft.skills.length})</h3>
                <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-primary hover:underline">
                  Editar
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {draft.skills.map((s) => {
                  const cat = catById.get(s.category_id);
                  return (
                    <div key={s.category_id} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat?.color ?? "#1a3a5c" }}
                      />
                      <span className="font-semibold">{cat?.name}</span>
                      <span className="text-muted-foreground">
                        · {SKILL_LEVEL_LABELS[s.skill_level]} · {s.years_experience} años
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-soft p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Disponibilidad</h3>
                <button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-primary hover:underline">
                  Editar
                </button>
              </div>
              <p className="mt-2 text-sm">
                <span className="text-lg font-extrabold text-primary">{draft.dates.length}</span>{" "}
                días disponibles
                {draft.dates.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}— del {formatDate(draft.dates[0]!)} al {formatDate(draft.dates[draft.dates.length - 1]!)}
                  </span>
                )}
              </p>
            </div>

            <div className="card-soft p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Alojamiento</h3>
                <button type="button" onClick={() => setStep(3)} className="text-sm font-semibold text-primary hover:underline">
                  Editar
                </button>
              </div>
              {draft.needs_accommodation ? (
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-success">Sí necesita</span> — desde{" "}
                  {draft.locality_origin}, del {formatDate(draft.dates_needed_start)} al{" "}
                  {formatDate(draft.dates_needed_end)}
                  {draft.special_requirements && (
                    <span className="block text-muted-foreground">
                      Requisitos: {draft.special_requirements}
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No necesita alojamiento</p>
              )}
            </div>

            <label className="card-soft flex cursor-pointer items-start gap-3 p-5">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[#00b8dd]"
              />
              <span className="text-sm font-semibold">
                Confirmo que todos los datos son correctos y quiero registrarme como
                voluntario.
              </span>
            </label>
          </section>
        )}

        {/* Navegación */}
        <div className="mt-8 flex items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || submitting}
            className="btn-outline"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Anterior
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="btn-accent" disabled={checkingNumber}>
              {checkingNumber ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !confirm}
              className="btn-accent !px-8 !py-4 text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando…
                </>
              ) : (
                "Enviar registro"
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
