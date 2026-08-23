import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Printer, Home, HardHat } from "lucide-react";

export interface SuccessSearch {
  n: string;
  nombre: string;
  dias: number;
}

export const Route = createFileRoute("/registro-exitoso")({
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
    n: String(search["n"] ?? ""),
    nombre: String(search["nombre"] ?? ""),
    dias: Number(search["dias"] ?? 0),
  }),
  head: () => ({
    meta: [
      { title: "¡Registro exitoso! — Voluntarios Obra" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { n, nombre, dias } = Route.useSearch();
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
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <HardHat className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Comprobante de registro
              </p>
              <p className="font-extrabold text-primary">Voluntarios Obra</p>
            </div>
          </div>

          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
              ¡Gracias por registrarte{nombre ? `, ${nombre.split(" ")[0]}` : ""}!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Tu número de voluntario es
            </p>
            <p className="mt-2 rounded-2xl bg-primary py-4 text-4xl font-extrabold tracking-wide text-primary-foreground">
              #{n ?? "—"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Guardalo: te lo van a pedir al ingresar a la obra.
              {typeof dias === "number" && dias > 0 && (
                <>
                  <br />
                  Registraste <strong>{dias}</strong>{" "}
                  {dias === 1 ? "día disponible" : "días disponibles"}.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>Fecha de registro: {today}</span>
            <span>voluntarios-obra</span>
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
