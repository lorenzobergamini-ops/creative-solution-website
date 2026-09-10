"use server";

/**
 * Quote form server actions (milestone M3).
 *
 * Every action re-validates its input server-side — the client is never
 * trusted. All DB writes and storage operations use the service-role client
 * (src/lib/supabase/server-actions.ts), which bypasses RLS; the service role
 * key never reaches the client bundle.
 *
 * Degradation without credentials: when Supabase is not configured every
 * action returns { ok: false, error: CONFIG_UNAVAILABLE_MESSAGE } so the UI
 * can show a clear message and the build stays green.
 */

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  quoteFormSchema,
  type QuoteFormData,
  type QuoteFileDescriptor,
} from "@/lib/validations/quote";
import {
  generateStoragePath,
  MAX_REFERENCE_FILES,
  validateUploadFile,
} from "@/lib/upload";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  CONFIG_UNAVAILABLE_MESSAGE,
  getAdminSupabaseClient,
  getQuoteUploadLimits,
} from "@/lib/supabase/server-actions";

// ----------------------------------------------------------------
// Rate limiting (M3 simple version — TODO(M6) definitive rate limit)
// ----------------------------------------------------------------
// Rules: max EMAIL_LIMIT successful requests per email address in 24h and
// max IP_LIMIT successful requests per IP in 1h. Implementation: append-only
// log in `quote_rate_limits` (one row per successful request and scope),
// counting rows inside the window. Migration: supabase/migrations/0002_rate_limit.sql.
const EMAIL_LIMIT = 3;
const EMAIL_WINDOW_HOURS = 24;
const IP_LIMIT = 5;
const IP_WINDOW_HOURS = 1;

export type CreateQuoteRequestResult =
  | { ok: true; quoteRequestId: string }
  | { ok: false; error: string; code?: string };

export interface SignedFileTarget {
  /** Index of the file in the request array (client mapping). */
  index: number;
  storagePath: string;
  signedUrl: string;
  token: string;
}

export type CreateSignedUploadUrlsResult =
  | { ok: true; quoteRequestId: string; files: SignedFileTarget[] }
  | { ok: false; error: string; code?: string };

export type CompleteQuoteUploadResult =
  | { ok: true; quoteRequestId: string }
  | { ok: false; error: string; code?: string; missingPaths?: string[] };

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function toNullableText(value: string | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Best-effort client IP (Vercel/typical proxies). Never trusted. */
async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    const realIp = h.get("x-real-ip");
    return realIp ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function countAttempts(
  supabase: SupabaseClient,
  scope: "email" | "ip",
  scopeHash: string,
  sinceHours: number,
): Promise<number> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("quote_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("scope_hash", scopeHash)
    .gte("window_start", since);
  // Fail-open on errors (M3): if the table is missing the limiter is
  // disabled rather than blocking all users. TODO(M6): fail closed.
  if (error) return 0;
  return count ?? 0;
}

async function recordAttempt(
  supabase: SupabaseClient,
  emailHash: string,
  ipHash: string,
  quoteRequestId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("quote_rate_limits").insert([
    { scope: "email", scope_hash: emailHash, window_start: now, quote_request_id: quoteRequestId },
    { scope: "ip", scope_hash: ipHash, window_start: now, quote_request_id: quoteRequestId },
  ]);
  if (error) return; // recording must never fail the request
  // Opportunistic cleanup of rows outside the retention window.
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  await supabase.from("quote_rate_limits").delete().lt("window_start", cutoff);
}

/**
 * TODO(M4): email notifications hook. Called after the whole upload flow
 * completes (request saved + every file uploaded). In M4 this will send the
 * admin notification via Resend WITHOUT any attachment (the 3D files are
 * never attached to emails — only links/IDs, per the technical analysis).
 */
async function notifyQuoteSubmitted(): Promise<void> {
  // No-op until M4 (Resend + domain verification).
}

// ----------------------------------------------------------------
// Action 1 — create the quote request
// ----------------------------------------------------------------

export async function createQuoteRequest(
  input: QuoteFormData & { turnstileToken?: string },
): Promise<CreateQuoteRequestResult> {
  // 1. Zod validation (server truth; same schema as the client).
  const parsed = quoteFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Alcuni dati non sono validi. Controlla i campi e riprova.",
      code: "validation",
    };
  }
  const data = parsed.data;

  // 2. Turnstile (skip only in documented dev mode — see src/lib/turnstile.ts).
  const turnstile = await verifyTurnstileToken(input.turnstileToken);
  if (!turnstile.success) {
    return {
      ok: false,
      error: "Verifica anti-bot non riuscita. Ricarica la pagina e riprova.",
      code: "turnstile",
    };
  }

  // 3. Supabase configured?
  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    return { ok: false, error: CONFIG_UNAVAILABLE_MESSAGE, code: "config" };
  }

  // 4. Rate limit (email + IP).
  const emailHash = sha256(data.clientEmail.trim().toLowerCase());
  const ipHash = sha256(await getClientIp());
  const emailCount = await countAttempts(
    supabase,
    "email",
    emailHash,
    EMAIL_WINDOW_HOURS,
  );
  if (emailCount >= EMAIL_LIMIT) {
    return {
      ok: false,
      error:
        "Hai già inviato il numero massimo di richieste nelle ultime 24 ore. Riprova domani.",
      code: "rate_limit",
    };
  }
  const ipCount = await countAttempts(supabase, "ip", ipHash, IP_WINDOW_HOURS);
  if (ipCount >= IP_LIMIT) {
    return {
      ok: false,
      error: "Troppe richieste inviate. Riprova tra un'ora.",
      code: "rate_limit",
    };
  }

  // 5. Insert the request (status 'new').
  const { data: inserted, error: insertError } = await supabase
    .from("quote_requests")
    .insert({
      status: "new",
      client_name: data.clientName,
      client_email: data.clientEmail,
      client_phone: toNullableText(data.clientPhone),
      contact_preference: data.contactPreference,
      project_title: data.projectTitle,
      description: data.description,
      quantity: data.quantity,
      material: toNullableText(data.material),
      color: toNullableText(data.color),
      deadline: toNullableText(data.deadline),
      notes: toNullableText(data.notes),
      has_3d_file: data.has3dFile,
      drive_link: toNullableText(data.driveLink),
      rights_confirmed: data.rightsConfirmed,
      privacy_accepted: data.privacyAccepted,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: "Errore durante il salvataggio della richiesta. Riprova tra poco.",
      code: "db",
    };
  }

  // 6. Record the attempt for rate limiting (best-effort).
  await recordAttempt(supabase, emailHash, ipHash, inserted.id);

  return { ok: true, quoteRequestId: inserted.id };
}

// ----------------------------------------------------------------
// Action 2 — issue signed upload URLs for the request files
// ----------------------------------------------------------------

export async function createSignedUploadUrls(
  quoteRequestId: string,
  files: QuoteFileDescriptor[],
): Promise<CreateSignedUploadUrlsResult> {
  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    return { ok: false, error: CONFIG_UNAVAILABLE_MESSAGE, code: "config" };
  }

  if (
    typeof quoteRequestId !== "string" ||
    quoteRequestId.length === 0 ||
    !Array.isArray(files) ||
    files.length === 0
  ) {
    return { ok: false, error: "Dati non validi.", code: "validation" };
  }

  // Re-validate every descriptor against the DB-configured limits.
  const limits = await getQuoteUploadLimits(supabase);
  const modelFiles = files.filter((f) => f.fileType === "model");
  const referenceFiles = files.filter((f) => f.fileType === "reference");
  if (modelFiles.length > 1) {
    return {
      ok: false,
      error: "Puoi allegare un solo file 3D.",
      code: "validation",
    };
  }
  if (referenceFiles.length > MAX_REFERENCE_FILES) {
    return {
      ok: false,
      error: `Massimo ${MAX_REFERENCE_FILES} immagini di riferimento.`,
      code: "validation",
    };
  }
  for (const file of files) {
    const validation = validateUploadFile(
      { name: file.originalName, size: file.sizeBytes, type: file.mimeType },
      file.fileType,
      limits,
    );
    if (!validation.ok) {
      return {
        ok: false,
        error: `${file.originalName}: ${validation.error}`,
        code: "validation",
      };
    }
  }

  // The quote request must exist and still be editable ('new').
  const { data: request, error: requestError } = await supabase
    .from("quote_requests")
    .select("id, status")
    .eq("id", quoteRequestId)
    .maybeSingle();
  if (requestError || !request) {
    return {
      ok: false,
      error: "Richiesta di preventivo non trovata.",
      code: "not_found",
    };
  }
  if (request.status !== "new") {
    return {
      ok: false,
      error: "La richiesta non è più modificabile.",
      code: "status",
    };
  }

  // Idempotency: drop previous pending rows so retries always re-issue a
  // fresh set of URLs without duplicating DB rows (uploaded rows are kept).
  await supabase
    .from("quote_files")
    .delete()
    .eq("quote_request_id", quoteRequestId)
    .eq("status", "pending");

  // Issue one signed upload URL per file (private bucket 'quote-files',
  // 60 min expiry). The storage path is generated server-side with a random
  // UUID — the original filename is never part of the path.
  const targets: SignedFileTarget[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const storagePath = generateStoragePath(quoteRequestId, file);
    const { data: signed, error: signedError } = await supabase.storage
      .from("quote-files")
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (signedError || !signed) {
      return {
        ok: false,
        error: "Impossibile preparare l'upload dei file. Riprova.",
        code: "storage",
      };
    }
    targets.push({
      index: i,
      storagePath,
      signedUrl: signed.signedUrl,
      token: signed.token,
    });
  }

  // Insert the file rows (status 'pending') only after every URL succeeded,
  // so we never leave orphan rows.
  const rows = files.map((file, i) => ({
    quote_request_id: quoteRequestId,
    storage_path: targets[i]!.storagePath,
    original_name: file.originalName,
    file_type: file.fileType,
    mime_type: toNullableText(file.mimeType),
    size_bytes: file.sizeBytes,
    status: "pending",
  }));
  const { error: insertError } = await supabase.from("quote_files").insert(rows);
  if (insertError) {
    return {
      ok: false,
      error: "Salvataggio dei file non riuscito. Riprova.",
      code: "db",
    };
  }

  return { ok: true, quoteRequestId, files: targets };
}

// ----------------------------------------------------------------
// Action 3 — confirm the uploads and finalize the request
// ----------------------------------------------------------------

export async function completeQuoteUpload(
  quoteRequestId: string,
  storagePaths: string[],
): Promise<CompleteQuoteUploadResult> {
  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    return { ok: false, error: CONFIG_UNAVAILABLE_MESSAGE, code: "config" };
  }

  const folder = `quotes/${quoteRequestId}`;
  if (
    typeof quoteRequestId !== "string" ||
    quoteRequestId.length === 0 ||
    !Array.isArray(storagePaths) ||
    storagePaths.length === 0 ||
    storagePaths.some(
      (path) => typeof path !== "string" || !path.startsWith(`${folder}/`),
    )
  ) {
    return { ok: false, error: "Percorsi file non validi.", code: "validation" };
  }

  // Verify on storage that every object actually exists (list the request
  // folder; the client cannot fake this).
  const { data: objects, error: listError } = await supabase.storage
    .from("quote-files")
    .list(folder, { limit: 100 });
  if (listError) {
    return {
      ok: false,
      error: "Verifica dei file non riuscita. Riprova.",
      code: "storage",
    };
  }
  const present = new Set(
    (objects ?? []).map((object) => `${folder}/${object.name}`),
  );
  const missing = storagePaths.filter((path) => !present.has(path));
  if (missing.length > 0) {
    return {
      ok: false,
      error: "Alcuni file non risultano caricati: riprova l'upload.",
      code: "missing_files",
      missingPaths: missing,
    };
  }

  // Mark the rows 'uploaded' (already-uploaded rows from a previous attempt
  // are left untouched — this keeps retries working).
  const { error: updateError } = await supabase
    .from("quote_files")
    .update({ status: "uploaded" })
    .eq("quote_request_id", quoteRequestId)
    .in("storage_path", storagePaths)
    .eq("status", "pending");
  if (updateError) {
    return {
      ok: false,
      error: "Aggiornamento dello stato non riuscito. Riprova.",
      code: "db",
    };
  }

  // Sanity check: every requested path must now be 'uploaded'.
  const { data: rows } = await supabase
    .from("quote_files")
    .select("storage_path, status")
    .eq("quote_request_id", quoteRequestId);
  const notUploaded = new Set(
    (rows ?? [])
      .filter((row) => row.status !== "uploaded")
      .map((row) => row.storage_path),
  );
  if (storagePaths.some((path) => notUploaded.has(path))) {
    return {
      ok: false,
      error: "Alcuni file non sono stati confermati. Riprova.",
      code: "db",
    };
  }

  // Everything is in place: hook for M4 email notifications (no attachments).
  await notifyQuoteSubmitted();

  return { ok: true, quoteRequestId };
}