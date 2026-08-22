import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { HardHat, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — Voluntarios Obra" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error("No se pudo enviar el email", { description: error.message });
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-primary-foreground"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <HardHat className="h-7 w-7" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">
              Voluntarios Obra
            </span>
          </Link>
        </div>

        <div className="card-soft p-8">
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto h-14 w-14 text-success" />
              <h1 className="mt-4 text-xl font-extrabold">Revisá tu correo</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Si existe una cuenta con <strong>{email}</strong>, te enviamos un
                enlace para restablecer tu contraseña.
              </p>
              <Link to="/login" className="btn-navy mt-6 w-full">
                Volver al ingreso
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-extrabold tracking-tight">
                Recuperar contraseña
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Te enviamos un enlace para restablecerla.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="input-field"
                    placeholder="coordinador@obra.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-accent w-full">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar enlace"}
                </button>
              </form>
              <div className="mt-5 text-center text-sm">
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Volver al ingreso
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
