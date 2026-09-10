import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

/**
 * Server client for PUBLIC read-only access (anon key + RLS).
 * Used ONLY in Server Components / Server Actions that read published
 * gallery content. Public reads go through RLS: only rows with
 * is_published = true are visible (see supabase/migrations/0001_init.sql).
 *
 * Deliberately NOT using @supabase/ssr's createServerClient here: the public
 * pages never touch cookies/auth, and reading cookies() would force the
 * pages to be dynamically rendered on every request. A plain anon client
 * (persistSession: false) keeps the gallery statically prerenderable (ISR).
 *
 * SECURITY: never import SUPABASE_SERVICE_ROLE_KEY here. The service role
 * stays reserved for admin Server Actions (later milestones) and must never
 * end up in the client bundle.
 */

let serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!serverClient) {
    serverClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }
  return serverClient;
}

/**
 * Public URL of a file stored in the public 'gallery' storage bucket.
 * Returns null when Supabase is not configured (nothing to point to).
 * The storage_path is the path relative to the bucket, e.g. "2026/ortaggio.jpg".
 */
export function getPublicGalleryImageUrl(storagePath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }
  return `${supabaseUrl}/storage/v1/object/public/gallery/${storagePath}`;
}