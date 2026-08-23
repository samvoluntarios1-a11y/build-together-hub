import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    // Verificar rol staff
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
      
    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }
      
    const isStaff = (roles ?? []).some((r) =>
      ["admin", "coordinator"].includes(r.role)
    );

    if (!isStaff) {
      // Si no es staff, no puede entrar al panel
      await supabase.auth.signOut();
      throw redirect({
        to: "/login",
      });
    }

    return { session, user: session.user };
  },
  component: () => <Outlet />,
});
