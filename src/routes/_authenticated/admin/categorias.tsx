import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: CategoriasPage,
});

function CategoriasPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Gestión de Categorías</h1>
      <p className="text-muted-foreground">Administración de oficios y habilidades.</p>
    </div>
  );
}
