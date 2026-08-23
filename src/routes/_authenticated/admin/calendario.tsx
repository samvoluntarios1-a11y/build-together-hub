import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  HardHat,
  Filter,
  Users,
  Search,
  Plus,
  BedDouble,
  Download,
  Trash2
} from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryIcon } from "@/lib/icons";
import { STATUS_LABELS, type AssignmentRow, type WorkCategory, type AssignmentStatus } from "@/lib/types";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, isWithinInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { AssignmentModal } from "@/components/admin/AssignmentModal";
import { downloadCSV, downloadExcel, printHtmlReport, reportHeader, reportFooter } from "@/lib/export";
import { updateAssignment, deleteAssignment } from "@/lib/calendar.functions";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/admin/calendario")({
  validateSearch: (search: Record<string, unknown>) => ({
    volunteer: typeof search["volunteer"] === "string" ? search["volunteer"] : undefined,
  }),
  component: CalendarioPage,
});

function CalendarioPage() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [isAssigning, setIsAssigning] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [showAvailability, setShowAvailability] = useState(false);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  
  // Fetch assignments for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["assignments", format(currentDate, "yyyy-MM"), viewMode],
    queryFn: async () => {
      const start = viewMode === "month" ? startOfWeek(monthStart, { weekStartsOn: 1 }) : startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = viewMode === "month" ? endOfWeek(monthEnd, { weekStartsOn: 1 }) : endOfWeek(currentDate, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("calendar_assignments")
        .select(`
          *,
          profiles (
            full_name,
            volunteer_number,
            locality,
            accommodation_requests (needs_accommodation, is_fulfilled),
            volunteer_skills (category_id, skill_level, years_experience)
          ),
          work_categories (id, name, color, icon)
        `)
        .gte("assignment_date", format(start, "yyyy-MM-dd"))
        .lte("assignment_date", format(end, "yyyy-MM-dd"));
        
      if (error) throw error;
      return data as unknown as AssignmentRow[];
    }
  });

  const { data: categories } = useQuery({
    queryKey: ["work-categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as WorkCategory[];
    }
  });

  // Calendar logic (replaced below)

  const { data: availabilitySummary } = useQuery({
    queryKey: ["availability-summary", format(currentDate, "yyyy-MM"), viewMode],
    queryFn: async () => {
      const start = viewMode === "month" ? startOfWeek(monthStart, { weekStartsOn: 1 }) : startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = viewMode === "month" ? endOfWeek(monthEnd, { weekStartsOn: 1 }) : endOfWeek(currentDate, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("availability")
        .select(`
          available_date,
          volunteer_id,
          profiles!inner (
            volunteer_skills (category_id)
          )
        `)
        .eq("is_available", true)
        .gte("available_date", format(start, "yyyy-MM-dd"))
        .lte("available_date", format(end, "yyyy-MM-dd"));
      
      if (error) throw error;

      // Group by date and category
      const counts: Record<string, Record<string, number>> = {};
      (data as any[])?.forEach((row: any) => {
        const date = row.available_date;
        if (!counts[date]) counts[date] = {};
        
        const skills = row.profiles?.volunteer_skills;
        if (Array.isArray(skills)) {
          skills.forEach((s: any) => {
            if (counts[date]) {
              counts[date][s.category_id] = (counts[date][s.category_id] || 0) + 1;
            }
          });
        }
      });
      return counts;
    },
    enabled: showAvailability
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: AssignmentStatus }) => updateAssignment({ data: { id, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Estado actualizado correctamente");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAssignment({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Asignación eliminada");
    }
  });

  // Calendar logic
  const days = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(monthStart, { weekStartsOn: 1 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  }, [monthStart, monthEnd, currentDate, viewMode]);

  const assignmentsByDay = useMemo(() => {
    const map = new Map<string, AssignmentRow[]>();
    assignments?.forEach(a => {
      const date = a.assignment_date;
      
      // Apply filters
      if (filterCategories.length > 0 && !filterCategories.includes(a.category_id)) return;
      if (filterLevel !== "all") {
        const skill = a.profiles?.volunteer_skills?.find((s: any) => s.category_id === a.category_id);
        if (skill?.skill_level !== filterLevel) return;
      }

      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(a);
    });
    return map;
  }, [assignments, filterCategories, filterLevel]);

  const handlePrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -7));
  };
  const handleNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 7));
  };
  const handleToday = () => setCurrentDate(new Date());

  const handleExportCSV = () => {
    if (!assignments) return;
    const headers = ["Fecha", "Categoría", "Voluntario", "Nivel", "Localidad", "Estado"];
    const rows = assignments.map(a => [
      a.assignment_date,
      a.work_categories?.name || "",
      a.profiles?.full_name || "",
      a.profiles?.volunteer_skills?.find((s: any) => s.category_id === a.category_id)?.skill_level || "",
      a.profiles?.locality || "",
      STATUS_LABELS[a.status] || a.status
    ]);
    downloadCSV(`asignaciones-${format(currentDate, "yyyy-MM")}.csv`, headers, rows);
  };

  const handleExportExcel = () => {
    if (!assignments) return;
    const rows = assignments.map(a => [
      a.assignment_date,
      a.work_categories?.name || "",
      a.profiles?.full_name || "",
      a.profiles?.volunteer_skills?.find((s: any) => s.category_id === a.category_id)?.skill_level || "",
      a.profiles?.locality || "",
      STATUS_LABELS[a.status] || a.status
    ]);
    downloadExcel(`asignaciones-${format(currentDate, "yyyy-MM")}.xlsx`, [{
      name: "Asignaciones",
      headers: ["Fecha", "Categoría", "Voluntario", "Nivel", "Localidad", "Estado"],
      rows
    }]);
  };

  const handlePrintPDF = () => {
    const title = `Reporte de Asignaciones - ${format(currentDate, "MMMM yyyy", { locale: es })}`;
    let html = reportHeader(title, viewMode === "month" ? "Vista Mensual" : "Vista Semanal");
    
    const sortedDays = [...days].sort((a, b) => a.getTime() - b.getTime());
    
    sortedDays.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayAssignments = assignmentsByDay.get(dateStr) || [];
      if (dayAssignments.length === 0) return;

      html += `<h2 class="day">${format(day, "EEEE dd 'de' MMMM", { locale: es })}</h2>`;
      
      const byCat: Record<string, AssignmentRow[]> = {};
      dayAssignments.forEach(a => {
        const catName = a.work_categories?.name || "Sin categoría";
        if (!byCat[catName]) byCat[catName] = [];
        byCat[catName].push(a);
      });

      Object.entries(byCat).forEach(([catName, list]) => {
        html += `<h3 class="cat">${catName}</h3>`;
        html += `<table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>N°</th>
              <th>Nivel</th>
              <th>Localidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(a => `
              <tr>
                <td>${a.profiles?.full_name}</td>
                <td>${a.profiles?.volunteer_number}</td>
                <td>${a.profiles?.volunteer_skills?.find((s: any) => s.category_id === a.category_id)?.skill_level || '-'}</td>
                <td>${a.profiles?.locality}</td>
                <td>${STATUS_LABELS[a.status]}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
      });
    });

    html += reportFooter();
    printHtmlReport(title, html);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 md:flex-row overflow-hidden">
      {/* Calendar Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 capitalize">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </h1>
            <div className="flex gap-1 border border-slate-200 rounded-lg p-0.5">
              <button onClick={handlePrev} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-500 transition">
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button onClick={handleToday} className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-md transition">
                Hoy
              </button>
              <button onClick={handleNext} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-500 transition">
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex bg-slate-100 p-0.5 rounded-lg mr-2">
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition ${viewMode === "month" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"}`}
              >
                Mes
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition ${viewMode === "week" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"}`}
              >
                Semana
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="btn-outline h-9 px-3 text-xs">
                  <Download className="h-4 w-4" />
                  Exportar
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>Exportar a CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>Exportar a Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintPDF}>Imprimir PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button 
              className="btn-navy h-9 px-4 text-xs"
              onClick={() => {
                setPreselectedCategoryId("");
                setIsAssigning(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva Asignación
            </button>
          </div>
        </div>

        {/* Filters and Toggle */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Categorías:</label>
            <div className="flex flex-wrap gap-1">
              {categories?.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setFilterCategories(prev => 
                      prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                    );
                  }}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${
                    filterCategories.includes(cat.id)
                      ? 'bg-navy text-white border-navy'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {filterCategories.length > 0 && (
                <button 
                  onClick={() => setFilterCategories([])}
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold text-red-500 hover:bg-red-50"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200"></div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Nivel:</label>
            <select 
              value={filterLevel} 
              onChange={(e) => setFilterLevel(e.target.value)}
              className="text-[10px] font-bold bg-slate-50 border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-navy"
            >
              <option value="all">Todos</option>
              <option value="primaria">Primaria</option>
              <option value="secundaria">Secundaria</option>
              <option value="basica">Básica</option>
            </select>
          </div>

          <div className="flex-1"></div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-navy transition">Mostrar Disponibilidad</span>
            <div 
              className={`w-8 h-4 rounded-full relative transition-colors ${showAvailability ? 'bg-success' : 'bg-slate-200'}`}
              onClick={() => setShowAvailability(!showAvailability)}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showAvailability ? 'left-4.5' : 'left-0.5'}`}></div>
            </div>
          </label>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => (
              <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)] bg-slate-200 gap-[1px]">
            {days.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const dayAssignments = assignmentsByDay.get(dateStr) || [];
              
              return (
                <div 
                  key={dateStr}
                  className={`relative flex flex-col gap-1 p-2 bg-white transition-colors hover:bg-slate-50/80 cursor-pointer ${!isCurrentMonth ? 'text-slate-300' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white' : ''}`}>
                      {format(day, "d")}
                    </span>
                    {dayAssignments.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayAssignments.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 overflow-hidden mt-1">
                    {dayAssignments.slice(0, 3).map(a => (
                      <div 
                        key={a.id}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium border-l-2"
                        style={{ 
                          backgroundColor: `${a.work_categories?.color || '#1a3a5c'}15`, 
                          borderColor: a.work_categories?.color || '#1a3a5c',
                          color: a.work_categories?.color || '#1a3a5c'
                        }}
                      >
                        {a.profiles?.full_name.split(' ')[0]} · {a.work_categories?.name}
                      </div>
                    ))}
                    {dayAssignments.length > 3 && (
                      <div className="text-[9px] font-bold text-slate-400 pl-1.5">
                        +{dayAssignments.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar Detail */}
      <div className="w-full md:w-80 border-l border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-extrabold text-slate-900">
            {selectedDay ? format(selectedDay, "d 'de' MMMM", { locale: es }) : "Detalle del día"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {selectedDay ? assignmentsByDay.get(format(selectedDay, "yyyy-MM-dd"))?.length || 0 : 0} asignaciones programadas
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedDay ? (
            assignmentsByDay.get(format(selectedDay, "yyyy-MM-dd"))?.length ? (
              assignmentsByDay.get(format(selectedDay, "yyyy-MM-dd"))?.map(a => (
                <div key={a.id} className="card-soft p-3 text-sm space-y-2 border-l-4" style={{ borderLeftColor: a.work_categories?.color }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">{a.profiles?.full_name}</h4>
                      <p className="text-[10px] text-slate-500">#{a.profiles?.volunteer_number} · {a.profiles?.locality}</p>
                    </div>
                    <button className="text-slate-400 hover:text-slate-900">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      <CategoryIcon name={a.work_categories?.icon || 'hard-hat'} className="h-3 w-3" />
                      {a.work_categories?.name}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      a.status === 'confirmed' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                    }`}>
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </div>
                  
                  {a.profiles?.accommodation_requests?.[0]?.needs_accommodation && (
                    <div className="flex items-center gap-1.5 text-[10px] text-accent font-bold bg-accent/5 rounded p-1.5 border border-accent/10">
                      <BedDouble className="h-3 w-3" />
                      Requiere Alojamiento
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <CalendarIcon className="mx-auto h-8 w-8 opacity-20" />
                <p className="text-sm">No hay voluntarios asignados para este día.</p>
                <button className="btn-outline h-8 px-3 text-xs">Asignar voluntario</button>
              </div>
            )
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <CalendarIcon className="mx-auto h-8 w-8 opacity-20" />
              <p className="text-sm">Seleccioná un día del calendario para ver el detalle.</p>
            </div>
          )}
        </div>
        
        {selectedDay && (
          <div className="p-4 border-t border-slate-200">
            <button className="btn-navy w-full text-xs">
              <UserPlus className="h-4 w-4" />
              Asignar Voluntario a este día
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
