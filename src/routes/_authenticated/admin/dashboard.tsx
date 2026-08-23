import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  HardHat, 
  Calendar, 
  BedDouble, 
  ArrowRight,
  Filter,
  Search,
  Download,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryIcon } from "@/lib/icons";
import { SKILL_LEVEL_LABELS, STATUS_LABELS, type VolunteerRow, type AssignmentStatus } from "@/lib/types";
import { downloadCSV, downloadExcel } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

const PAGE_SIZE = 10;

function AdminDashboard() {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [localityFilter, setLocalityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  
  // Fetch volunteers with skills and availability
  const { data: volunteersData, isLoading } = useQuery({
    queryKey: ["volunteers", page, searchTerm, localityFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(`
          *,
          volunteer_skills (
            id,
            category_id,
            skill_level,
            years_experience,
            description,
            work_categories (id, name, color, icon)
          ),
          availability (available_date),
          accommodation_requests (
            id,
            needs_accommodation,
            is_fulfilled,
            locality_origin,
            dates_needed_start,
            dates_needed_end
          )
        `, { count: "exact" });

      if (searchTerm) {
        query = query.ilike("full_name", `%${searchTerm}%`);
      }
      if (localityFilter) {
        query = query.ilike("locality", `%${localityFilter}%`);
      }
      
      // Filter by skill category if selected
      if (categoryFilter) {
        // This is a bit complex in Supabase direct filtering, often easier to fetch and filter or use a specific RPC
        // For now we'll handle basic profile filtering and could improve this with a view or RPC
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      return { volunteers: data as unknown as VolunteerRow[], total: count ?? 0 };
    }
  });

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: accommodation } = await supabase.from("accommodation_requests").select("*", { count: "exact", head: true }).eq("is_fulfilled", false);
      const { count: assignments } = await supabase.from("calendar_assignments").select("*", { count: "exact", head: true }).gte("assignment_date", new Date().toISOString().split('T')[0]);
      
      return {
        total: total ?? 0,
        pendingAccommodation: accommodation ?? 0,
        upcomingAssignments: assignments ?? 0,
      };
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
      return data;
    }
  });

  const handleExportCSV = () => {
    if (!volunteersData?.volunteers) return;
    const headers = ["Número", "Nombre", "Localidad", "Habilidades", "Días Disponibles", "Alojamiento"];
    const rows = volunteersData.volunteers.map(v => [
      v.volunteer_number,
      v.full_name,
      v.locality,
      v.volunteer_skills?.map(s => s.work_categories?.name).filter(Boolean).join(", ") || "",
      v.availability?.length || 0,
      v.accommodation_requests?.[0]?.needs_accommodation ? "Sí" : "No"
    ]);
    downloadCSV("voluntarios.csv", headers, rows);
    toast.success("CSV exportado correctamente");
  };

  const handleExportExcel = () => {
    if (!volunteersData?.volunteers) return;
    const rows = volunteersData.volunteers.map(v => [
      v.volunteer_number,
      v.full_name,
      v.locality,
      v.volunteer_skills?.map(s => s.work_categories?.name).filter(Boolean).join(", ") || "",
      v.availability?.length || 0,
      v.accommodation_requests?.[0]?.needs_accommodation ? "Sí" : "No"
    ]);
    downloadExcel("voluntarios.xlsx", [
      {
        name: "Voluntarios",
        headers: ["Número", "Nombre", "Localidad", "Habilidades", "Días Disponibles", "Alojamiento"],
        rows
      }
    ]);
    toast.success("Excel exportado correctamente");
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Header & Stats */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">Resumen general y gestión de voluntarios.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="btn-outline h-10 px-4 text-xs"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button 
            onClick={handleExportExcel}
            className="btn-navy h-10 px-4 text-xs"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-soft p-5 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Voluntarios</p>
              <h2 className="mt-1 text-3xl font-extrabold text-slate-900">{stats?.total ?? 0}</h2>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="card-soft p-5 border-l-4 border-l-accent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Alojamiento Pend.</p>
              <h2 className="mt-1 text-3xl font-extrabold text-slate-900">{stats?.pendingAccommodation ?? 0}</h2>
            </div>
            <div className="rounded-xl bg-accent/10 p-3 text-accent">
              <BedDouble className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="card-soft p-5 border-l-4 border-l-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Próximas Asign.</p>
              <h2 className="mt-1 text-3xl font-extrabold text-slate-900">{stats?.upcomingAssignments ?? 0}</h2>
            </div>
            <div className="rounded-xl bg-success/10 p-3 text-success">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-soft p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Buscar por nombre</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                className="input-field pl-9 h-10 text-sm" 
                placeholder="Nombre del voluntario..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Localidad</label>
            <input 
              type="text" 
              className="input-field h-10 text-sm" 
              placeholder="Ej: Junín"
              value={localityFilter}
              onChange={(e) => { setLocalityFilter(e.target.value); setPage(0); }}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</label>
            <select 
              className="select-field h-10 text-sm"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            >
              <option value="">Todas</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => { setSearchTerm(""); setLocalityFilter(""); setCategoryFilter(""); setPage(0); }}
            className="btn-outline h-10 px-4 text-xs"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Voluntario</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Habilidades</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Disponibilidad</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Alojamiento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Clock className="mx-auto h-8 w-8 animate-spin text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">Cargando voluntarios...</p>
                  </td>
                </tr>
              ) : volunteersData?.volunteers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-200" />
                    <p className="mt-2 text-sm text-slate-500">No se encontraron voluntarios.</p>
                  </td>
                </tr>
              ) : (
                volunteersData?.volunteers.map((v) => (
                  <tr key={v.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{v.full_name}</span>
                        <span className="text-xs text-slate-500">#{v.volunteer_number} · {v.locality}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {v.volunteer_skills?.map((s) => (
                          <div 
                            key={s.id} 
                            className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold"
                            style={{ color: s.work_categories?.color || 'inherit' }}
                          >
                            <CategoryIcon name={s.work_categories?.icon || 'hard-hat'} className="h-3 w-3" />
                            {s.work_categories?.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {v.availability?.length || 0} días
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {v.accommodation_requests?.[0]?.needs_accommodation ? (
                        <div className="flex items-center gap-1.5">
                          {v.accommodation_requests[0].is_fulfilled ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/20 text-success">
                              <CheckCircle2 className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent">
                              <Clock className="h-3 w-3" />
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-700">Requerido</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          to="/admin/calendario" 
                          search={{ volunteer: v.id } as any}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary transition"
                          title="Asignar"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Link>
                        <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {volunteersData && volunteersData.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <span className="text-xs text-slate-500">
              Mostrando {page * PAGE_SIZE + 1} a {Math.min((page + 1) * PAGE_SIZE, volunteersData.total)} de {volunteersData.total} voluntarios
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-outline h-8 w-8 p-0 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= volunteersData.total}
                className="btn-outline h-8 w-8 p-0 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
