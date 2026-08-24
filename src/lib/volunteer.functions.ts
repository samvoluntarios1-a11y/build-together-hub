import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteVolunteer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Solo un admin puede eliminar voluntarios
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw roleError;
    if (!isAdmin) throw new Error("No tenés permisos para eliminar voluntarios");

    // Operación privilegiada: el cliente admin evita bloqueos de RLS
    // y permite borrar las filas relacionadas en orden (FK).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables = [
      "calendar_assignments",
      "availability",
      "volunteer_skills",
      "accommodation_requests",
    ] as const;

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("volunteer_id", data.id);
      if (error) throw new Error(`Error al eliminar datos relacionados (${table}): ${error.message}`);
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", data.id);
    if (error) throw error;

    return { success: true };
  });
