import { supabase } from "@/integrations/supabase/client";

export const attachSupabaseAuth = async ({ request }: { request: Request }) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    request.headers.set("Authorization", `Bearer ${session.access_token}`);
  }
};
