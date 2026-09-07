import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Calendar as CalendarIcon, 
  User, 
  MapPin, 
  Briefcase, 
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Info,
  Repeat
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAssignmentRecommendations, createBulkAssignments } from "@/lib/calendar.functions";
import { SKILL_LEVEL_LABELS, type WorkCategory } from "@/lib/types";
import { toast } from "sonner";
import { CategoryIcon } from "@/lib/icons";

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  categories: WorkCategory[];
  defaultCategoryId?: string;
}

export function AssignmentModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  categories, 
  defaultCategoryId 
}: AssignmentModalProps) {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(defaultCategoryId || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [showOthers, setShowOthers] = useState(false);
  const [notes, setNotes] = useState("");

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    if (defaultCategoryId) setCategoryId(defaultCategoryId);
  }, [defaultCategoryId]);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["recommendations", dateStr, categoryId, searchTerm],
    queryFn: () => getAssignmentRecommendations({ 
      data: {
        date: dateStr, 
        categoryId, 
        searchTerm 
      }
    }),
    enabled: !!categoryId && isOpen
  });

  const volunteerIndex = useMemo(() => {
    const map = new Map<string, any>();
    [
      ...(recommendations?.recommended ?? []),
      ...(recommendations?.flexible ?? []),
      ...(recommendations?.others ?? []),
    ].forEach((v: any) => map.set(v.id, v));
    return map;
  }, [recommendations]);

  const mutation = useMutation({
    mutationFn: (volunteerIds: string[]) => createBulkAssignments({
      data: {
        assignments: volunteerIds.map(id => {
          const vol = volunteerIndex.get(id);
          const isRecommended = (recommendations?.recommended ?? []).some((v: any) => v.id === id);
          const isFlexible = (recommendations?.flexible ?? []).some((v: any) => v.id === id);
          return {
            volunteer_id: id,
            category_id: categoryId,
            assignment_date: dateStr,
            notes,
            status: "assigned" as const,
            availability_source: isRecommended
              ? ("specific_date" as const)
              : isFlexible
                ? ("flexible_rule" as const)
                : ("manual" as const),
            flexible_rule_id: isFlexible ? (vol?.flexible_rule_id ?? null) : null,
            is_override: !isRecommended && !isFlexible ? true : !!vol?.quota_full,
            override_reason: !isRecommended && !isFlexible
              ? "Asignado sin disponibilidad declarada"
              : vol?.quota_full
                ? "Excede el cupo de su disponibilidad flexible"
                : null,
          };
        })
      }
    }),

    onSuccess: (data) => {
      if (data.successCount > 0) {
        toast.success(`Se asignaron ${data.successCount} voluntarios correctamente.`);
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        onClose();
        resetForm();
      }
      if (data.duplicateCount > 0) {
        toast.warning(`${data.duplicateCount} voluntarios ya estaban asignados.`);
      }
      if (data.errorCount > 0) {
        toast.error(`Error en ${data.errorCount} asignaciones.`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al realizar las asignaciones.");
    }
  });

  const resetForm = () => {
    setSelectedVolunteers([]);
    setShowOthers(false);
    setSearchTerm("");
    setNotes("");
  };

  const toggleVolunteer = (id: string) => {
    setSelectedVolunteers(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleAssign = () => {
    if (selectedVolunteers.length === 0) return;
    mutation.mutate(selectedVolunteers);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-extrabold text-navy flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-cyan" />
            Nueva Asignación
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Fecha de trabajo</label>
              <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-sm font-bold text-slate-700">
                {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Categoría / Área</label>
              <select 
                value={categoryId} 
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSelectedVolunteers([]);
                }}
                className="select-field h-10 text-sm font-bold"
              >
                <option value="">Seleccionar categoría...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Notas (opcional)</label>
            <Input 
              placeholder="Indicaciones para el voluntario..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre o N° de voluntario..." 
              className="pl-9 h-10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-2">
          {!categoryId ? (
            <div className="py-12 text-center text-slate-400">
              <Info className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm">Seleccioná una categoría para ver recomendaciones.</p>
            </div>
          ) : isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-20 mb-2" />
              <p className="text-sm">Buscando voluntarios disponibles...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recommended List */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Recomendados disponibles ({recommendations?.recommended.length || 0})
                  </h3>
                </div>

                {recommendations?.recommended.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                    <p className="text-xs text-slate-500">No se encontraron voluntarios disponibles para esta fecha.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recommendations?.recommended.map((vol: any) => (
                      <VolunteerCard 
                        key={vol.id} 
                        volunteer={vol} 
                        isSelected={selectedVolunteers.includes(vol.id)}
                        onToggle={() => toggleVolunteer(vol.id)}
                        date={dateStr}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Flexible List */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-cyan" />
                    Disponibilidad flexible compatible ({recommendations?.flexible?.length || 0})
                  </h3>
                </div>

                {(recommendations?.flexible?.length ?? 0) === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                    <p className="text-xs text-slate-500">Nadie con disponibilidad flexible coincide con esta fecha.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recommendations?.flexible?.map((vol: any) => (
                      <VolunteerCard
                        key={vol.id}
                        volunteer={vol}
                        isSelected={selectedVolunteers.includes(vol.id)}
                        onToggle={() => {
                          if (!selectedVolunteers.includes(vol.id) && vol.quota_full) {
                            if (confirm(`${vol.full_name} ya cubrió su cupo (${vol.quota_used}/${vol.quota_max}) en este período. ¿Asignarlo igual?`)) {
                              toggleVolunteer(vol.id);
                            }
                          } else {
                            toggleVolunteer(vol.id);
                          }
                        }}
                        isFlexible
                        date={dateStr}
                      />
                    ))}
                  </div>
                )}
              </section>


              {/* Others List */}
              <section>
                <button 
                  onClick={() => setShowOthers(!showOthers)}
                  className="w-full flex items-center justify-between py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-navy transition border-t border-slate-100 mt-4"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Otros candidatos con la habilidad ({recommendations?.others.length || 0})
                  </div>
                  {showOthers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showOthers && (
                  <div className="space-y-2 mt-2">
                    {recommendations?.others.length === 0 ? (
                      <p className="text-center py-4 text-xs text-slate-400 italic">No hay otros candidatos con esta habilidad.</p>
                    ) : (
                      recommendations?.others.map((vol: any) => (
                        <VolunteerCard 
                          key={vol.id} 
                          volunteer={vol} 
                          isSelected={selectedVolunteers.includes(vol.id)}
                          onToggle={() => {
                            if (!selectedVolunteers.includes(vol.id)) {
                              if (confirm(`El voluntario ${vol.full_name} no indicó disponibilidad para el ${format(parseISO(dateStr), 'dd/MM/yyyy')}. ¿Deseás asignarlo de todos modos?`)) {
                                toggleVolunteer(vol.id);
                              }
                            } else {
                              toggleVolunteer(vol.id);
                            }
                          }}
                          isOthers
                          date={dateStr}
                        />
                      ))
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-slate-100 flex items-center justify-between sm:justify-between">
          <div className="text-xs font-bold text-slate-500">
            {selectedVolunteers.length} voluntarios seleccionados
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button 
              className="btn-navy h-9 px-6 text-xs font-bold"
              disabled={selectedVolunteers.length === 0 || mutation.isPending}
              onClick={handleAssign}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar {selectedVolunteers.length} {selectedVolunteers.length === 1 ? 'voluntario' : 'voluntarios'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VolunteerCard({ 
  volunteer, 
  isSelected, 
  onToggle, 
  isOthers = false,
  date 
}: { 
  volunteer: any; 
  isSelected: boolean; 
  onToggle: () => void; 
  isOthers?: boolean;
  date: string;
}) {
  return (
    <div 
      className={`group flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer ${
        isSelected 
          ? 'bg-navy/5 border-navy ring-1 ring-navy/20' 
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} className="pointer-events-none" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-bold text-slate-900 truncate">{volunteer.full_name}</h4>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded">#{volunteer.volunteer_number}</span>
          {volunteer.other_assignment && (
            <Badge variant="outline" className="h-4 px-1.5 text-[8px] uppercase font-black bg-amber-50 text-amber-600 border-amber-200">
              <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Ya tiene asignación
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1 text-slate-500">
            <MapPin className="h-3 w-3" /> {volunteer.locality}
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-bold uppercase">
            <Briefcase className="h-3 w-3" /> 
            <span className={volunteer.skill_level === 'primaria' ? 'text-navy' : 'text-slate-600'}>
              {SKILL_LEVEL_LABELS[volunteer.skill_level as keyof typeof SKILL_LEVEL_LABELS] || volunteer.skill_level}
            </span> 
            · {volunteer.years_experience} años
          </div>
        </div>
        
        {volunteer.description && (
          <p className="text-[10px] text-slate-400 italic mt-1 truncate">"{volunteer.description}"</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5">
        {isOthers ? (
          <Badge variant="outline" className="text-[9px] uppercase font-black text-red-500 border-red-200 bg-red-50">
            No disponible
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] uppercase font-black text-success border-success/30 bg-success/5">
            Disponible {format(parseISO(date), 'dd/MM')}
          </Badge>
        )}
      </div>
    </div>
  );
}
