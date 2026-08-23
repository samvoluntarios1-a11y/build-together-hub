import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Check, 
  Settings,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryIcon, ICON_OPTIONS } from "@/lib/icons";
import { type WorkCategory } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: CategoriasPage,
});

function CategoriasPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState<Partial<WorkCategory>>({
    name: "",
    description: "",
    color: "#1a3a5c",
    icon: "hard-hat",
    sort_order: 0,
    is_active: true
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["work-categories-admin-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as WorkCategory[];
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (cat: Partial<WorkCategory>) => {
      const { data, error } = await supabase
        .from("work_categories")
        .upsert(cat as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-categories-admin-full"] });
      queryClient.invalidateQueries({ queryKey: ["work-categories-admin"] });
      toast.success(editingId ? "Categoría actualizada" : "Categoría creada");
      setEditingId(null);
      setIsAdding(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error("Error al guardar la categoría", { description: err.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("work_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-categories-admin-full"] });
      toast.success("Categoría eliminada");
    },
    onError: () => {
      toast.error("No se pudo eliminar la categoría", { 
        description: "Es posible que tenga voluntarios o asignaciones vinculadas." 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#1a3a5c",
      icon: "hard-hat",
      sort_order: (categories?.length ?? 0) * 10,
      is_active: true
    });
  };

  const startEdit = (cat: WorkCategory) => {
    setEditingId(cat.id);
    setFormData(cat);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!formData.name?.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    upsertMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Configuración LDC</h1>
          <p className="text-slate-500 text-sm">Administrá los oficios, habilidades y categorías de trabajo.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }}
          className="btn-navy h-10 px-4"
        >
          <Plus className="h-4.5 w-4.5" />
          Nueva Categoría
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="card-soft p-6 border-2 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? "Editar Categoría" : "Nueva Categoría"}
            </h2>
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</label>
              <input 
                className="input-field h-10 text-sm" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Electricidad"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Color (Hex)</label>
              <div className="flex gap-2">
                <input 
                  type="color"
                  className="h-10 w-12 rounded-lg border border-slate-200 p-1 bg-white cursor-pointer"
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                />
                <input 
                  className="input-field h-10 text-sm flex-1" 
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ícono</label>
              <select 
                className="select-field h-10 text-sm"
                value={formData.icon}
                onChange={e => setFormData({ ...formData, icon: e.target.value })}
              >
                {ICON_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción</label>
              <input 
                className="input-field h-10 text-sm" 
                value={formData.description || ""}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descripción del oficio..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Orden y Estado</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number"
                  className="input-field h-10 text-sm w-24" 
                  value={formData.sort_order}
                  onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    className="h-4 w-4 rounded text-primary border-slate-300"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-slate-700">Activa</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3 border-t border-primary/10 pt-6">
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="btn-outline h-10 px-6"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="btn-navy h-10 px-8"
            >
              {upsertMutation.isPending ? "Guardando..." : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-soft h-32 animate-pulse bg-slate-100/50" />
          ))
        ) : categories?.map(cat => (
          <div 
            key={cat.id} 
            className={`card-soft group p-5 transition-all hover:shadow-lifted ${!cat.is_active ? 'opacity-60 grayscale' : ''}`}
            style={{ borderTop: `4px solid ${cat.color}` }}
          >
            <div className="flex items-start justify-between">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-110"
                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
              >
                <CategoryIcon name={cat.icon} className="h-6 w-6" />
              </div>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button 
                  onClick={() => startEdit(cat)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary transition"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                      deleteMutation.mutate(cat.id);
                    }
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900">{cat.name}</h3>
                {!cat.is_active && (
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Inactiva</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{cat.description || "Sin descripción."}</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className="uppercase tracking-widest">Orden: {cat.sort_order}</span>
              <span className="font-mono">{cat.color.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
      
      {categories?.length === 0 && !isLoading && (
        <div className="card-soft py-20 text-center">
          <Settings className="mx-auto h-12 w-12 text-slate-200" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">No hay categorías</h3>
          <p className="mt-2 text-slate-500">Comenzá creando la primera categoría de trabajo para LDC.</p>
          <button 
            onClick={() => { setIsAdding(true); resetForm(); }}
            className="btn-navy mt-6 h-10 px-6"
          >
            <Plus className="h-4.5 w-4.5" />
            Nueva Categoría
          </button>
        </div>
      )}
    </div>
  );
}
