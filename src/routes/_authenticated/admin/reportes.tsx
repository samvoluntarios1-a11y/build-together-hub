import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Users, 
  Filter,
  CheckCircle2,
  Clock,
  HardHat,
  PieChart,
  BarChart3
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV, downloadExcel, printHtmlReport, reportHeader, reportFooter, type ExportFilters } from "@/lib/export";
import { toast } from "sonner";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { ExportModal } from "@/components/admin/ExportModal";
import { STATUS_LABELS, type AssignmentRow } from "@/lib/types";


export const Route = createFileRoute("/_authenticated/admin/reportes")({
  component: ReportesPage,
});

function ReportesPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);


  // Stats for the report preview
  const { data: stats } = useQuery({
    queryKey: ["report-stats"],
    queryFn: async () => {
      const { data: categories } = await supabase.from("work_categories").select("id, name");
      const { data: profiles } = await supabase.from("profiles").select("id");
      const { data: assignments } = await supabase.from("calendar_assignments").select("id, status");
      
      return {
        volunteers: profiles?.length || 0,
        assignments: assignments?.length || 0,
        confirmed: assignments?.filter(a => a.status === 'confirmed').length || 0,
        categories: categories?.length || 0
      };
    }
  });

  const generateVolunteerReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          volunteer_number,
          full_name,
          locality,
          volunteer_skills (
            work_categories (name),
            skill_level,
            years_experience
          )
        `)
        .order("full_name");
      
      if (error) throw error;

      const rows = data.map(v => [
        v.volunteer_number,
        v.full_name,
        v.locality,
        v.volunteer_skills.map(s => s.work_categories?.name).join(", "),
        v.volunteer_skills.map(s => `${s.skill_level} (${s.years_experience}a)`).join(" | ")
      ]);

      downloadExcel(`Reporte_Voluntarios_${format(new Date(), "yyyy-MM-dd")}.xlsx`, [{
        name: "Voluntarios",
        headers: ["Nro", "Nombre Completo", "Localidad", "Oficios", "Niveles/Exp"],
        rows
      }]);
      
      toast.success("Excel de voluntarios generado");
    } catch (err) {
      toast.error("Error al generar el reporte");
    } finally {
      setIsGenerating(false);
    }
  };

  const printDailyPlan = async () => {
    setIsGenerating(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("calendar_assignments")
        .select(`
          profiles (full_name, volunteer_number, locality),
          work_categories (name),
          status,
          notes
        `)
        .eq("assignment_date", today);
      
      if (error) throw error;

      let html = reportHeader("Planilla Diaria de Obra", `Fecha: ${format(new Date(), "PP", { locale: es })}`);
      
      html += `
        <h2 class="day">Personal Asignado (${data?.length || 0})</h2>
        <table>
          <thead>
            <tr>
              <th>Voluntario</th>
              <th>Localidad</th>
              <th>Oficio</th>
              <th>Estado</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${data?.length ? data.map(a => `
              <tr>
                <td><strong>${a.profiles?.full_name}</strong><br><small>#${a.profiles?.volunteer_number}</small></td>
                <td>${a.profiles?.locality}</td>
                <td>${a.work_categories?.name}</td>
                <td><span class="badge ${a.status === 'confirmed' ? 'badge-p' : 'badge-s'}">${a.status}</span></td>
                <td>${a.notes || ""}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" class="empty">No hay asignaciones para hoy</td></tr>'}
          </tbody>
        </table>
      `;
      
      html += reportFooter();
      printHtmlReport("Planilla Diaria", html);
      
    } catch (err) {
      toast.error("Error al generar planilla");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (period: { type: string; from?: string; to?: string }, formatType: 'csv' | 'excel' | 'pdf') => {
    setIsGenerating(true);
    try {
      let start: Date;
      let end: Date;

      if (period.type === "current_week") {
        start = startOfWeek(new Date(), { weekStartsOn: 1 });
        end = endOfWeek(new Date(), { weekStartsOn: 1 });
      } else if (period.type === "current_month") {
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
      } else {
        start = parseISO(period.from!);
        end = parseISO(period.to!);
      }

      const { data, error } = await supabase
        .from("calendar_assignments")
        .select(`
          *,
          profiles (
            full_name,
            volunteer_number,
            locality,
            volunteer_skills (category_id, skill_level, years_experience)
          ),
          work_categories (id, name, color, icon)
        `)
        .gte("assignment_date", format(start, "yyyy-MM-dd"))
        .lte("assignment_date", format(end, "yyyy-MM-dd"));

      if (error) throw error;

      const filteredData = data as unknown as AssignmentRow[];
      const filename = `reporte-asignaciones-${format(start, "yyyyMMdd")}-${format(end, "yyyyMMdd")}`;
      const periodStr = `${format(start, "dd/MM/yyyy")} al ${format(end, "dd/MM/yyyy")}`;

      if (formatType === 'excel') {
        const rows = filteredData.map(a => [
          a.assignment_date,
          a.work_categories?.name || "",
          a.profiles?.full_name || "",
          a.profiles?.volunteer_number || "",
          a.profiles?.volunteer_skills?.find((s: any) => s.category_id === a.category_id)?.skill_level || "",
          a.profiles?.locality || "",
          STATUS_LABELS[a.status] || a.status
        ]);
        downloadExcel(`${filename}.xlsx`, [{
          name: "Asignaciones",
          headers: ["Fecha", "Categoría", "Nombre", "N° Voluntario", "Nivel", "Localidad", "Estado"],
          rows
        }]);
      } else if (formatType === 'pdf') {
        let html = reportHeader("Reporte de Asignaciones", `Período: ${periodStr}`);
        
        const byDate: Record<string, Record<string, AssignmentRow[]>> = {};
        filteredData.forEach(a => {
          const dateKey = a.assignment_date;
          if (!byDate[dateKey]) byDate[dateKey] = {};
          const catName = a.work_categories?.name || "Sin categoría";
          const dayMap = byDate[dateKey];
          if (!dayMap[catName]) dayMap[catName] = [];
          dayMap[catName].push(a);
        });

        const sortedDates = Object.keys(byDate).sort();

        sortedDates.forEach(dateStr => {
          const date = parseISO(dateStr);
          html += `<h2 class="day">${format(date, "EEEE dd 'de' MMMM", { locale: es })}</h2>`;
          
          const dayCategories = byDate[dateStr] || {};
          Object.entries(dayCategories).forEach(([catName, list]) => {
            html += `<h3 class="cat">${catName}</h3>`;
            html += `<table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>N°</th>
                  <th>Nivel</th>
                  <th>Exp</th>
                  <th>Localidad</th>
                </tr>
              </thead>
              <tbody>
                ${list.map(a => {
                  const skill = a.profiles?.volunteer_skills?.find((s: any) => s.category_id === a.category_id);
                  return `
                  <tr>
                    <td><strong>${a.profiles?.full_name}</strong></td>
                    <td>${a.profiles?.volunteer_number}</td>
                    <td>${skill?.skill_level || '-'}</td>
                    <td>${skill?.years_experience || 0}a</td>
                    <td>${a.profiles?.locality}</td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>`;
          });
        });

        html += reportFooter();
        printHtmlReport(filename, html);
      }
      
      toast.success("Reporte generado");
    } catch (err) {
      toast.error("Error al generar el reporte");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Reportes</h1>
        <p className="text-slate-500 text-sm">Exportación de datos y planillas de control.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Report Cards */}
        <div className="card-soft flex flex-col p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Padrón de Voluntarios</h3>
          <p className="mt-2 flex-1 text-sm text-slate-500 leading-relaxed">
            Listado completo de voluntarios registrados con sus habilidades, localidad y experiencia. Ideal para auditoría y contacto.
          </p>
          <div className="mt-6 flex gap-2">
            <button 
              onClick={generateVolunteerReport}
              disabled={isGenerating}
              className="btn-navy h-9 flex-1 text-xs"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
            <button 
              onClick={() => setIsExporting(true)}
              className="btn-outline h-9 flex-1 text-xs"
            >
              <Printer className="h-4 w-4" />
              PDF
            </button>

          </div>
        </div>

        <div className="card-soft flex flex-col p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-4">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Planilla Diaria</h3>
          <p className="mt-2 flex-1 text-sm text-slate-500 leading-relaxed">
            Hoja de asistencia para el día de hoy. Incluye nombres, números de voluntario y tareas asignadas.
          </p>
          <div className="mt-6 flex gap-2">
            <button 
              onClick={printDailyPlan}
              disabled={isGenerating}
              className="btn-navy h-9 w-full text-xs"
            >
              <Printer className="h-4 w-4" />
              Imprimir Planilla
            </button>
          </div>
        </div>

        <div className="card-soft flex flex-col p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Download className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Reporte Personalizado</h3>
          <p className="mt-2 flex-1 text-sm text-slate-500 leading-relaxed">
            Genera un reporte de asignaciones detallado eligiendo un rango de fechas específico.
          </p>
          <div className="mt-6 flex gap-2">
            <button 
              onClick={() => setIsExporting(true)}
              className="btn-navy h-9 w-full text-xs"
            >
              <Calendar className="h-4 w-4" />
              Seleccionar Rango
            </button>
          </div>
        </div>
      </div>

      <ExportModal 
        isOpen={isExporting}
        onClose={() => setIsExporting(false)}
        onConfirm={(period, formatType) => handleExport(period, formatType)}
      />


      <div className="card-soft p-6 bg-slate-50/50 border-dashed border-2">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Estado del Sistema</h3>
        <div className="mt-4 grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Voluntarios</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats?.volunteers || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asignaciones</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats?.assignments || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmadas</p>
            <p className="text-2xl font-extrabold text-success">{stats?.confirmed || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categorías</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats?.categories || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
