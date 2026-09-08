import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { 
  User, 
  MapPin, 
  Hash, 
  Calendar as CalendarIcon, 
  BedDouble, 
  Briefcase, 
  Clock,
  ChevronRight,
  Info,
  List,
  LayoutGrid,
  Trash2
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { CategoryIcon } from "@/lib/icons";
import { SKILL_LEVEL_LABELS, STATUS_LABELS, type VolunteerRow } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface VolunteerProfileModalProps {
  volunteer: VolunteerRow | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (volunteer: VolunteerRow) => void;
}

export function VolunteerProfileModal({ volunteer, isOpen, onClose, onDelete }: VolunteerProfileModalProps) {
  const [availabilityView, setAvailabilityView] = useState<"calendar" | "list">("calendar");

  const availableDates = useMemo(() => {
    if (!volunteer?.availability) return [];
    return volunteer.availability.map(a => parseISO(a.available_date));
  }, [volunteer?.availability]);

  const groupedDates = useMemo(() => {
    if (!volunteer?.availability) return {};
    const groups: Record<string, Date[]> = {};
    
    // Sort dates first
    const sortedDates = [...availableDates].sort((a, b) => a.getTime() - b.getTime());
    
    sortedDates.forEach(date => {
      const monthKey = format(date, "MMMM yyyy", { locale: es });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(date);
    });
    
    return groups;
  }, [availableDates]);

  if (!volunteer) return null;

  const accommodation = volunteer.accommodation_requests?.[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <span>Perfil del Voluntario</span>
              <p className="text-sm font-normal text-slate-500 mt-1">#{volunteer.volunteer_number} · Registrado el {format(parseISO(volunteer.created_at), "dd/MM/yyyy")}</p>
            </div>
            {onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => onDelete(volunteer)}
                title="Eliminar Voluntario"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left Column: Basic Info & Skills */}
            <div className="space-y-8">
              {/* Basic Info */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Datos Básicos
                </h3>
                <div className="card-soft p-5 bg-slate-50/50 border-slate-100">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Nombre Completo</label>
                      <p className="text-sm font-bold text-slate-900">{volunteer.full_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Localidad</label>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {volunteer.locality}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Estado</label>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          Activo
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Skills */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Habilidades
                </h3>
                <div className="space-y-3">
                  {volunteer.volunteer_skills?.map((skill) => (
                    <div key={skill.id} className="card-soft p-4 border-l-4" style={{ borderLeftColor: skill.work_categories?.color || '#cbd5e1' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="p-1.5 rounded-lg text-white"
                            style={{ backgroundColor: skill.work_categories?.color || '#94a3b8' }}
                          >
                            <CategoryIcon name={(skill.work_categories?.icon as any) || 'hard-hat'} className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{skill.work_categories?.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">
                              Nivel: {SKILL_LEVEL_LABELS[skill.skill_level]} · {skill.years_experience} años exp.
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        "{skill.description || "Sin descripción adicional"}"
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Assignments */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Historial de Asignaciones
                </h3>
                <div className="card-soft overflow-hidden">
                  {!volunteer.calendar_assignments || volunteer.calendar_assignments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/30">
                      <p className="text-xs text-slate-400">Sin asignaciones previas.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {volunteer.calendar_assignments.map((assignment) => (
                        <div key={assignment.id} className="p-3 hover:bg-slate-50 transition flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-center min-w-[40px]">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{format(parseISO(assignment.assignment_date), "MMM", { locale: es })}</p>
                              <p className="text-lg font-black text-slate-900 leading-none">{format(parseISO(assignment.assignment_date), "dd")}</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{assignment.work_categories?.name}</p>
                              <Badge variant="secondary" className="text-[9px] h-4 px-1 uppercase font-bold">
                                {STATUS_LABELS[assignment.status]}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Availability & Accommodation */}
            <div className="space-y-8">
              {/* Availability */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" /> Disponibilidad
                  </h3>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    <button 
                      onClick={() => setAvailabilityView("calendar")}
                      className={`p-1 rounded-md transition ${availabilityView === "calendar" ? "bg-white shadow-sm text-primary" : "text-slate-500"}`}
                      title="Vista Calendario"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => setAvailabilityView("list")}
                      className={`p-1 rounded-md transition ${availabilityView === "list" ? "bg-white shadow-sm text-primary" : "text-slate-500"}`}
                      title="Vista Lista"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="card-soft p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600">Total: {volunteer.availability?.length || 0} días disponibles</p>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-success"></div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Disponible</span>
                    </div>
                  </div>

                  {availabilityView === "calendar" ? (
                    <div className="bg-slate-50 rounded-xl p-2 flex justify-center border border-slate-100">
                      <Calendar
                        mode="multiple"
                        selected={availableDates}
                        locale={es}
                        className="rounded-md"
                        // Custom styling for selected dates
                        modifiers={{ available: availableDates }}
                        modifiersClassNames={{
                          available: "bg-success text-success-foreground hover:bg-success hover:text-success-foreground opacity-100"
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {Object.keys(groupedDates).length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-xs text-slate-400">Sin fechas seleccionadas.</p>
                        </div>
                      ) : (
                        Object.entries(groupedDates).map(([month, dates]) => (
                          <div key={month}>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 border-b border-slate-100 pb-1">{month}</h4>
                            <div className="grid grid-cols-2 gap-1.5">
                              {dates.map((date, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-success/5 border border-success/10">
                                  <div className="h-1.5 w-1.5 rounded-full bg-success"></div>
                                  <span className="text-xs font-medium text-slate-700">{format(date, "dd/MM/yyyy")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Flexible availability */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                  <Repeat className="h-4 w-4" /> Disponibilidad Flexible
                </h3>
                {activeFlexible.length === 0 ? (
                  <div className="card-soft p-5 bg-slate-50/50 border-slate-100">
                    <p className="text-xs text-slate-400">Sin reglas de disponibilidad flexible.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeFlexible.map((rule) => (
                      <div key={rule.id} className="card-soft p-4 border-l-4 border-l-accent">
                        <p className="text-sm font-bold text-slate-900">{describeFlexible(rule)}</p>
                        <p className="text-xs text-slate-500 mt-1">{describeValidity(rule)}</p>
                        {rule.preferred_shift && (
                          <Badge variant="outline" className="mt-2 text-[10px] font-bold uppercase">
                            Turno: {SHIFT_LABELS[rule.preferred_shift]}
                          </Badge>
                        )}
                        {rule.notes && (
                          <p className="text-xs text-slate-600 italic mt-2">"{rule.notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Accommodation */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                  <BedDouble className="h-4 w-4" /> Alojamiento
                </h3>
                <div className="card-soft p-5 border-l-4 border-l-accent bg-accent/5">
                  {!accommodation?.needs_accommodation ? (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                        <Info className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">No necesita alojamiento</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-accent text-accent-foreground font-black uppercase text-[10px]">Necesita Alojamiento</Badge>
                        {accommodation.is_fulfilled && (
                          <Badge variant="outline" className="text-success border-success/30 font-bold text-[10px]">Confirmado</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Origen</label>
                          <p className="text-sm font-bold text-slate-900">{accommodation.locality_origin}</p>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Desde</label>
                          <p className="text-sm font-bold text-slate-900">{accommodation.dates_needed_start ? format(parseISO(accommodation.dates_needed_start), "dd/MM/yyyy") : "No definido"}</p>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Hasta</label>
                          <p className="text-sm font-bold text-slate-900">{accommodation.dates_needed_end ? format(parseISO(accommodation.dates_needed_end), "dd/MM/yyyy") : "No definido"}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Requisitos Especiales</label>
                        <p className="text-xs text-slate-700 italic">
                          {accommodation.special_requirements || "Ninguno"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
