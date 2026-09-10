import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ALLOWED_MODEL_EXTENSIONS,
  MAX_FILE_SIZE_MB,
} from "@/lib/upload";

/**
 * SERVICE-ROLE Supabase client — SERVER ONLY.
 *
 * This module must NEVER be imported from a client component:
 * it reads SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS. It is used by the
 * quote-form server actions (src/app/actions/quote.ts) for ALL writes and for
 * issuing signed upload URLs against the private `quote-files` bucket.
 *
 * The key lives only in server env vars; `createClient` is called lazily,
 * and only when the URL + service role key are both present, so the build
 * stays green without credentials and every operation degrades with a clear
 * Italian message ("configurazione non disponibile").
 */

/** Message returned by actions when Supabase credentials are not configured. */
export const CONFIG_UNAVAILABLE_MESSAGE =
  "La configurazione del modulo non è disponibile in questo momento. Riprova più tardi.";

export function isServiceRoleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

let adminClient: SupabaseClient | null = null;

/** Lazy singleton service-role client. Returns null when not configured. */
export function getAdminSupabaseClient(): SupabaseClient | null {
  if (!isServiceRoleConfigured()) {
    return null;
  }
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }
  return adminClient;
}

export interface QuoteUploadLimits {
  maxFileSizeMb: number;
  allowedExtensions: string[];
}

/**
 * Reads the upload limits from `site_settings` (source of truth once the
 * admin panel exists) with safe defaults on any failure. The client UI shows
 * the static defaults from src/lib/site-settings.ts; the server ENFORCES
 * these values when issuing signed URLs — the server is authoritative.
 */
export async function getQuoteUploadLimits(
  supabase: SupabaseClient,
): Promise<QuoteUploadLimits> {
  let maxFileSizeMb = MAX_FILE_SIZE_MB;
  let allowedExtensions = [...ALLOWED_MODEL_EXTENSIONS] as string[];

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["max_file_size_mb", "allowed_file_extensions"]);

  if (!error && Array.isArray(data)) {
    for (const row of data as { key: string; value: string }[]) {
      if (row.key === "max_file_size_mb") {
        const parsed = Number(row.value);
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 500) {
          maxFileSizeMb = parsed;
        }
      } else if (row.key === "allowed_file_extensions") {
        try {
          const parsed: unknown = JSON.parse(row.value);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((entry) => typeof entry === "string")
          ) {
            allowedExtensions = parsed.map((entry) =>
              String(entry).toLowerCase(),
            );
          }
        } catch {
          // Malformed JSON in settings: keep the default extensions.
        }
      }
    }
  }

  return { maxFileSizeMb, allowedExtensions };
}