import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "./client";

/**
 * Server-side admin session helpers (milestone M5) — SERVER ONLY.
 *
 * getAdminSession() is the single source of truth for "is this request
 * authenticated as an admin?". It is called by the admin panel layout AND by
 * EVERY admin server action; the client is never trusted.
 *
 * It uses @supabase/ssr createServerClient with the request cookies (anon
 * key + RLS — never the service role) and verifies:
 *   1. the auth session (getUser() hits the auth server, no JWT guessing);
 *   2. the `profiles` row has role='admin' (profiles_select_own policy lets
 *      a user read only their own row).
 *
 * Degradation without credentials: if the NEXT_PUBLIC_* env vars are not set,
 * the client cannot be created and the result is { configured: false,
 * userId: null, isAdmin: false } so the UI can render an honest empty state
 * ("configurazione non disponibile") and the build stays green in CI.
 */

export interface AdminSessionState {
  /** True only when the Supabase env vars are configured. */
  configured: boolean;
  /** id of the authenticated user (null when not logged in). */
  userId: string | null;
  /** True only when the authenticated profile has role='admin'. */
  isAdmin: boolean;
}

const UNAUTHENTICATED: AdminSessionState = {
  configured: false,
  userId: null,
  isAdmin: false,
};

export async function getAdminSession(): Promise<AdminSessionState> {
  if (!isSupabaseConfigured()) {
    return UNAUTHENTICATED;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            // Server Components cannot set cookies; middleware refreshes
            // the session on navigation instead. Ignoring is fine here.
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookie writes are ignored.
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { configured: true, userId: null, isAdmin: false };
  }

  // Verify the role server-side (RLS allows reading only the own row).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    configured: true,
    userId: user.id,
    isAdmin: profile?.role === "admin",
  };
}