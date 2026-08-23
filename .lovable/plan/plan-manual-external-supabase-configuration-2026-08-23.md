# Plan: Manual External Supabase Configuration

This plan adapts the project to use a custom Supabase instance instead of Lovable Cloud, using environment variables for configuration.

## User Review Required

> [!IMPORTANT]
> You need to add these two secrets in the Lovable project settings:
> 1. `VITE_SUPABASE_URL`: Your Supabase Project URL (e.g., `https://xyz.supabase.co`)
> 2. `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase `anon` / `public` key.

## Proposed Changes

### Configuration Adjustments
- Modify `src/integrations/supabase/client.ts` to strictly prioritize `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Modify `src/integrations/supabase/auth-middleware.ts` to use these same variables on the server side.
- Modify `src/integrations/supabase/client.server.ts` to use `VITE_SUPABASE_URL` (the user explicitly mentioned not needing the service role key on the frontend/regular use, but server-side admin logic requires it if used; however, we will ensure it at least tries to use the external URL). *Note: The user specifically asked to avoid service role keys in the frontend, but we'll ensure the URL is correct for server logic too.*

### Security & Authentication
- Enable `attachSupabaseAuth` in `src/start.ts` to ensure the session token is passed to server functions.
- Ensure the authentication logic in `login.tsx` and `register.tsx` works with the new configuration.

## Technical Details
- **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Logic**: Use `import.meta.env` for the browser and `process.env` for the server, ensuring consistent access to your external project.
- **Verification**: Use automated checks to ensure the client initializes without errors when these variables are present.
