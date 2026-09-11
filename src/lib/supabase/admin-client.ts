import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

/**
 * Admin-panel browser client (milestone M5) — CLIENT-SAFE module.
 *
 * This module is imported ONLY by client components (login form, admin
 * sidebar/logout). It uses the ANON key + RLS via @supabase/ssr
 * `createBrowserClient` with session persistence (cookies): the panel
 * authenticates with Supabase Auth and the session cookie is refreshed
 * automatically by the SSR client helpers.
 *
 * SECURITY: the service-role key NEVER lives here. Every protected server
 * action re-verifies the session AND the profiles.role='admin' row server-side
 * (see src/lib/supabase/admin-session.ts + src/app/actions/admin.ts). The
 * browser client alone can never read quote_requests / quote_files: those
 * tables have no RLS policies for anon/authenticated (deny by default).
 */

/** Message shown when Supabase credentials are not configured. */
export const ADMIN_CONFIG_UNAVAILABLE_MESSAGE =
  "La configurazione del modulo non è disponibile in questo momento. Riprova più tardi.";

let adminBrowserClient: SupabaseClient | null = null;

/**
 * Browser client for the admin panel. Returns null when Supabase is not
 * configured — callers must handle null (honest empty state).
 * persistSession + autoRefreshToken are the defaults of createBrowserClient.
 */
export function getSupabaseAdminBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!adminBrowserClient) {
    adminBrowserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return adminBrowserClient;
}