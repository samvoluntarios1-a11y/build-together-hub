import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Voluntarios LDC" },
      { name: "description", content: "Acceso de administradores y coordinadores de Voluntarios LDC." },
      { property: "og:title", content: "Iniciar sesión — Voluntarios LDC" },
      { property: "og:description", content: "Acceso de administradores y coordinadores de Voluntarios LDC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
    const raw: unknown = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((t): t is number => typeof t === "number" && t <= Date.now() && Date.now() - t < WINDOW_MS);
  } catch {
    return [];
  }
}

function recordAttempt() {
  const attempts = [...getAttempts(), Date.now()];
  try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts)); } catch { /* Storage may be unavailable. */ }
  return attempts.length;
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    const attempts = getAttempts();
    if (attempts.length >= MAX_ATTEMPTS) {
      const minutes = Math.max(1, Math.ceil((Math.min(...attempts) + WINDOW_MS - Date.now()) / 60000));
      setErrorMessage(`Superaste los 5 intentos por hora en este navegador. Podés volver a intentar en ${minutes} minutos o recuperar tu contraseña.`);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        if (error.code === "invalid_credentials") recordAttempt();
        setErrorMessage(authErrorMessage(error));
        return;
      }
      // Verificar que tenga rol de staff
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      if (rolesError) {
        console.error("Error al obtener roles:", rolesError);
        toast.error("Error de permisos", {
          description: "No se pudieron verificar tus permisos. Contactá a soporte.",
        });
        await supabase.auth.signOut();
        return;
      }
      
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
      try { localStorage.removeItem(ATTEMPTS_KEY); } catch { /* Storage may be unavailable. */ }
      toast.success("¡Bienvenido!");
      await navigate({ to: "/admin/dashboard" });
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin + "/login" },
      });
      if (error) {
        setErrorMessage(authErrorMessage(error));
        return;
      }
      // Confirmed existing addresses can return an obfuscated signup response.
      // Do not claim a new account was created or that signup implies sign-in.
      if (!data.session) setConfirmationEmail(email.trim());
      else toast.success("Solicitud completada", { description: "Un administrador debe asignarte permisos para acceder al panel." });
      setPassword("");
      setMode("login");
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-primary-foreground flex flex-col items-center">
          <Link to="/" className="inline-block">
            <AppLogo 
              variant="default" 
              iconClassName="h-8 w-8" 
              textClassName="text-2xl font-extrabold text-primary-foreground" 
            />
          </Link>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Panel de administración — solo coordinadores
          </p>
        </div>

        <div className="card-soft p-8">
          <h1 className="text-xl font-extrabold tracking-tight">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          {confirmationEmail && (
            <div role="status" className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>Revisá el correo de <strong className="break-all">{confirmationEmail}</strong> y la carpeta de spam. Si es una cuenta nueva, confirmala con el enlace recibido.</p>
              <p>Si ya tenías cuenta, iniciá sesión o recuperá tu contraseña. Para acceder al panel, un administrador debe asignarte permisos.</p>
            </div>
          )}
          {errorMessage && <p role="alert" className="mt-4 text-sm text-destructive">{errorMessage}</p>}

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
                placeholder="coordinador@voluntarios.org"
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
            <Button type="submit" disabled={loading} className="btn-accent w-full">
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
            </Button>
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
                <Button variant="ghost"
                  type="button"
                  disabled={loading}
                  onClick={() => { setMode("signup"); setErrorMessage(""); setConfirmationEmail(""); }}
                  className="h-auto whitespace-normal text-muted-foreground hover:text-foreground"
                >
                  ¿Primera vez? Crear cuenta de coordinador
                </Button>
              </>
            ) : (
              <Button variant="link"
                type="button"
                disabled={loading}
                onClick={() => { setMode("login"); setErrorMessage(""); }}
                className="font-semibold text-primary hover:underline"
              >
                Ya tengo cuenta — iniciar sesión
              </Button>
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
