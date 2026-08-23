import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/calendario")({
  component: CalendarioPage,
});

function CalendarioPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Calendario de Asignaciones</h1>
      <p className="text-muted-foreground">Vista semanal y mensual de voluntarios.</p>
    </div>
  );
}
