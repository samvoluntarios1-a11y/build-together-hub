import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Panel de Administración</h1>
      <p className="text-muted-foreground">Bienvenido al sistema de gestión de voluntarios.</p>
    </div>
  );
}
