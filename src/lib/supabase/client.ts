import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * True only when the public Supabase credentials are present.
 * Without them no client is created: the public pages degrade gracefully
 * (honest empty states) and the build stays green in CI where the
 * NEXT_PUBLIC_* vars are not set.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

let browserClient: SupabaseClient | null = null;

/**
 * Browser client (anon key + RLS). Used ONLY in client components / effects.
 * Returns null when Supabase is not configured — callers must handle null.
 *
 * TODO(M5): this client will be the base for the admin panel once Supabase
 * Auth is wired into the app. Never put the service role key here.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}