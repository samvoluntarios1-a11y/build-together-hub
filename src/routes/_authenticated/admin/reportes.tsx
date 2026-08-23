import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/reportes")({
  component: ReportesPage,
});

function ReportesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Reportes y Exportación</h1>
      <p className="text-muted-foreground">Generación de archivos Excel y PDF.</p>
    </div>
  );
}
