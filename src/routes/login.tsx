import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { HardHat, Loader2, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acceso coordinadores — Voluntarios Obra" },
      { name: "description", content: "Ingreso al panel de administración de voluntarios." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

const ATTEMPTS_KEY = "vo-login-attempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

function getAttempts(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]") as number[];
    return raw.filter((t) => Date.now() - t < WINDOW_MS);
  } catch {
    return [];
  }
}

function recordAttempt() {
  const attempts = [...getAttempts(), Date.now()];
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  return attempts.length;
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (getAttempts().length >= MAX_ATTEMPTS) {
      toast.error("Demasiados intentos", {
        description: "Superaste los 5 intentos por hora. Probá más tarde.",
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        recordAttempt();
        toast.error("No se pudo iniciar sesión", {
          description: "Verificá tu email y contraseña.",
        });
        return;
      }
      // Verificar que tenga rol de staff
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const isStaff = (roles ?? []).some((r) =>
        ["admin", "coordinator"].includes(r.role),
      );
      if (!isStaff) {
        await supabase.auth.signOut();
        toast.error("Sin permisos de administración", {
          description:
            "Tu cuenta existe pero todavía no tiene rol de administrador o coordinador.",
        });
        return;
      }
      localStorage.removeItem(ATTEMPTS_KEY);
      toast.success("¡Bienvenido!");
      navigate({ to: "/admin/dashboard" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin + "/login" },
      });
      if (error) {
        toast.error("No se pudo crear la cuenta", { description: error.message });
        return;
      }
      toast.success("Cuenta creada", {
        description:
          "Verificá tu email para activarla. Luego un administrador debe asignarte el rol correspondiente.",
      });
      setMode("login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-primary-foreground">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <HardHat className="h-7 w-7" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">
              Voluntarios Obra
            </span>
          </Link>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Panel de administración — solo coordinadores
          </p>
        </div>

        <div className="card-soft p-8">
          <h1 className="text-xl font-extrabold tracking-tight">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>

          <form
            onSubmit={mode === "login" ? handleLogin : handleSignup}
            className="mt-6 space-y-4"
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input-field"
                placeholder="coordinador@obra.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
                Contraseña {mode === "signup" && "(mínimo 8 caracteres)"}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-accent w-full">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-5 w-5" />
                  Ingresar
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Crear cuenta
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-center text-sm">
            {mode === "login" ? (
              <>
                <Link
                  to="/forgot-password"
                  className="font-semibold text-primary hover:underline"
                >
                  Olvidé mi contraseña
                </Link>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ¿Primera vez? Crear cuenta de coordinador
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-semibold text-primary hover:underline"
              >
                Ya tengo cuenta — iniciar sesión
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-primary-foreground/60">
          Acceso restringido. Todos los ingresos quedan registrados.
        </p>
      </div>
    </div>
  );
}
