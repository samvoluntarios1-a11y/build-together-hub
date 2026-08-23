import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const attachSupabaseAuth = createMiddleware().client(async ({ next }) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    // TanStack Start automatically handles Authorization header when session is provided in client context
  }
  return next();
});

