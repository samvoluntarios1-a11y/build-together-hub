import { createFileRoute, Link } from "@tanstack/react-router";
import { HardHat, ClipboardList, CalendarDays, BedDouble, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-voluntarios.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voluntarios Obra — Sumate como voluntario" },
      {
        name: "description",
        content:
          "Registro abierto de voluntarios para la obra: cargá tus habilidades, elegí tus días disponibles y pedí alojamiento si lo necesitás.",
      },
      { property: "og:title", content: "Voluntarios Obra — Sumate como voluntario" },
      {
        property: "og:description",
        content:
          "Registro abierto de voluntarios para la obra: cargá tus habilidades, elegí tus días disponibles y pedí alojamiento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: ClipboardList,
    title: "Contanos quién sos",
    text: "Tu número de voluntario, nombre y localidad. Sin crear cuenta ni contraseñas.",
  },
  {
    icon: HardHat,
    title: "Cargá tus habilidades",
    text: "Hasta 3 oficios con tu nivel y años de experiencia, para asignarte donde más rendís.",
  },
  {
    icon: CalendarDays,
    title: "Elegí tus días",
    text: "Marcá en el calendario los días que podés venir durante los 18 meses de obra.",
  },
  {
    icon: BedDouble,
    title: "Alojamiento si venís de lejos",
    text: "Si necesitás dónde quedarte, lo coordinamos con tu registro.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <HardHat className="h-6 w-6" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Voluntarios Obra
            </span>
          </div>
          <Link
            to="/login"
            className="rounded-xl border border-primary-foreground/30 px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
          >
            Acceso coordinadores
          </Link>
        </div>
      </header>

      <main>
        <section className="bg-primary pb-16 pt-12 text-primary-foreground md:pb-24 md:pt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
            <div>
              <p className="mb-3 inline-block rounded-full bg-accent/15 px-4 py-1 text-sm font-bold text-accent">
                Registro abierto — 18 meses de obra
              </p>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
                Sumate como voluntario a la obra
              </h1>
              <p className="mt-4 max-w-lg text-lg text-primary-foreground/80">
                Necesitamos manos con ganas. Registrate en 5 minutos, contanos
                qué sabés hacer y en qué días podés dar una mano.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/register" className="btn-accent no-print text-lg">
                  Quiero ser voluntario
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <span className="text-sm text-primary-foreground/70">
                  Sin cuenta · Sin contraseña · Desde tu celular
                </span>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl shadow-lifted">
              <img
                src={heroImg}
                alt="Voluntarios trabajando en la obra"
                width={1344}
                height={896}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            ¿Cómo funciona?
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card-soft p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-primary">
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-extrabold text-accent">
                    Paso {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/register" className="btn-navy text-base">
              Comenzar mi registro
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Voluntarios Obra — Gestión de voluntarios para la construcción
      </footer>
    </div>
  );
}
