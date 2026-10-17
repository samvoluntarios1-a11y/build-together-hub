import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Printer, Home } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

export interface SuccessSearch {
  n: string;
  nombre: string;
  dias: number;
  tipo?: "registro" | "actualizacion";
  modo?: "fechas" | "flexible";
}

export const Route = createFileRoute("/registro-exitoso")({
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
    n: String(search["n"] ?? ""),
    nombre: String(search["nombre"] ?? ""),
    dias: Number(search["dias"] ?? 0),
    tipo: search["tipo"] === "actualizacion" ? "actualizacion" : "registro",
    modo: search["modo"] === "flexible" ? "flexible" : "fechas",
  }),
  head: () => ({
    meta: [
      { title: "Comprobante — Voluntarios LDC" },
      { name: "description", content: "Comprobante de registro o actualización de disponibilidad en Voluntarios LDC." },
      { property: "og:title", content: "Comprobante — Voluntarios LDC" },
      { property: "og:description", content: "Comprobante de registro o actualización de disponibilidad en Voluntarios LDC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { n, nombre, dias, tipo, modo } = Route.useSearch();
  const isUpdate = tipo === "actualizacion";
  const today = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Comprobante imprimible */}
        <div className="print-area card-soft p-8">
          <div className="flex items-center gap-3 border-b-2 border-primary pb-4">
            <AppLogo variant="default" showText={false} iconClassName="h-6 w-6" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isUpdate ? "Comprobante de actualización" : "Comprobante de registro"}
              </p>
              <p className="font-extrabold text-primary">Voluntarios LDC</p>
            </div>
          </div>

          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
              {isUpdate
                ? `¡Listo${nombre ? `, ${nombre.split(" ")[0]}` : ""}!`
                : `¡Gracias por registrarte${nombre ? `, ${nombre.split(" ")[0]}` : ""}!`}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isUpdate
                ? "Actualizamos tu disponibilidad. Tu número de voluntario sigue siendo"
                : "Tu número de voluntario es"}
            </p>
            <p className="mt-2 rounded-2xl bg-primary py-4 text-4xl font-extrabold tracking-wide text-primary-foreground">
              #{n ?? "—"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Guardalo: te lo van a pedir al ingresar a los voluntarios.
              {modo === "flexible" ? (
                <>
                  <br />
                  Registraste una <strong>disponibilidad flexible</strong>: te vamos a
                  contactar según la frecuencia que indicaste.
                </>
              ) : (
                typeof dias === "number" && dias > 0 && (
                  <>
                    <br />
                    {isUpdate ? "Agregaste" : "Registraste"} <strong>{dias}</strong>{" "}
                    {dias === 1 ? "día disponible" : "días disponibles"}.
                  </>
                )
              )}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>
              {isUpdate ? "Fecha de actualización" : "Fecha de registro"}: {today}
            </span>
            <span>voluntarios-ldc</span>
          </div>
        </div>

        <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-accent flex-1"
          >
            <Printer className="h-5 w-5" />
            Descargar comprobante (PDF)
          </button>
          <Link to="/" className="btn-outline flex-1">
            <Home className="h-5 w-5" />
            Volver al inicio
          </Link>
        </div>
        <p className="no-print mt-4 text-center text-xs text-muted-foreground">
          Para guardar el comprobante en PDF elegí «Guardar como PDF» en la
          ventana de impresión.
        </p>
      </div>
    </div>
  );
}
