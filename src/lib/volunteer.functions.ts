import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const deleteVolunteer = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // Note: We use the client-side supabase here assuming the caller is authenticated
    // and has RLS permissions. If we need service_role, we'd import it.
    // However, profiles has RLS and only admins should be able to delete.
    
    // First, verify admin role if we want extra safety, but RLS should handle it.
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", data.id);

    if (error) throw error;
    return { success: true };
  });
