import { supabase } from "@/integrations/supabase/client";

export const attachSupabaseAuth = async ({ next }: { next: () => Promise<any> }) => {
  const { data: { session } } = await supabase.auth.getSession();
  // TanStack Start client-side function middleware
  return next();
};
