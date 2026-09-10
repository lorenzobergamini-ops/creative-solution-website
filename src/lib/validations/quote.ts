import { z } from "zod";

/**
 * Shared Zod schema for the quote form (milestone M3).
 *
 * This module is imported by BOTH the client wizard (src/components/quote)
 * and the server actions (src/app/actions/quote.ts): the client validates
 * for UX, the server ALWAYS re-validates — the client is never trusted.
 *
 * UI text is Italian; identifiers/fields are English snake_case to match
 * the database columns in supabase/migrations/0001_init.sql.
 */

export const CONTACT_PREFERENCES = ["email", "phone", "whatsapp"] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_NOTES_LENGTH = 2000;

/**
 * Base quote form schema (server truth). File fields (File objects) are
 * intentionally NOT part of this schema: they exist only client-side and are
 * described to the server via QuoteFileDescriptor (paths/sizes, not bytes).
 *
 * driveLink stays optional here on purpose — the "required when has3dFile and
 * no file is attached" rule is enforced in the client wizard schema (where
 * the File object is known) and, on the server, by rejecting upload-less
 * requests with has3dFile=true whose drive_link is empty at submit time
 * (see src/app/actions/quote.ts). The invariant "has3dFile => file OR link"
 * is re-checked on every server action.
 */
export const quoteFormSchema = z.object({
  // Step 1 — Contatti
  clientName: z
    .string()
    .trim()
    .min(2, "Il nome deve contenere almeno 2 caratteri.")
    .max(120, "Il nome è troppo lungo (max 120 caratteri)."),
  clientEmail: z
    .string()
    .trim()
    .email("Inserisci un indirizzo email valido."),
  clientPhone: z
    .string()
    .trim()
    .max(30, "Il numero di telefono è troppo lungo (max 30 caratteri).")
    .optional()
    .or(z.literal("")),
  contactPreference: z.enum(CONTACT_PREFERENCES, {
    errorMap: () => ({ message: "Scegli un canale di contatto." }),
  }),

  // Step 2 — Il progetto
  projectTitle: z
    .string()
    .trim()
    .min(3, "Il titolo deve contenere almeno 3 caratteri.")
    .max(200, "Il titolo è troppo lungo (max 200 caratteri)."),
  description: z
    .string()
    .trim()
    .min(20, "Descrivi il progetto in almeno 20 caratteri.")
    .max(MAX_DESCRIPTION_LENGTH, `Massimo ${MAX_DESCRIPTION_LENGTH} caratteri.`),
  quantity: z
    .number({ invalid_type_error: "Inserisci una quantità valida." })
    .int("La quantità deve essere un numero intero.")
    .min(1, "La quantità minima è 1.")
    .max(1000, "La quantità massima è 1000."),
  material: z
    .string()
    .trim()
    .max(100, "Massimo 100 caratteri.")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .trim()
    .max(100, "Massimo 100 caratteri.")
    .optional()
    .or(z.literal("")),
  // Free text on purpose: no binding dates, the owner replies with real
  // availability after the request reaches them.
  deadline: z
    .string()
    .trim()
    .max(500, "Massimo 500 caratteri.")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(MAX_NOTES_LENGTH, `Massimo ${MAX_NOTES_LENGTH} caratteri.`)
    .optional()
    .or(z.literal("")),

  // Step 3 — File 3D
  has3dFile: z.boolean(),
  // Optional URL (Drive/WeTransfer link when the model exceeds the limit).
  // Required-if-no-file rule: see module docstring above.
  driveLink: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .url("Inserisci un link valido (es. https://drive.google.com/…).")
        .max(2000, "Il link è troppo lungo (max 2000 caratteri)."),
    ])
    .optional(),

  // Step 5 — Consensi (riepilogo)
  // boolean (initial false) refined to require true: input type stays
  // boolean so React Hook Form default values (false) type-check.
  rightsConfirmed: z.boolean().refine((value) => value === true, {
    message: "Devi confermare di avere i diritti sui file inviati.",
  }),
  privacyAccepted: z.boolean().refine((value) => value === true, {
    message: "Devi accettare l'informativa privacy.",
  }),
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;

/**
 * Description of a file the client wants to upload. The client sends ONLY
 * metadata: the actual bytes go directly from the browser to Supabase
 * Storage via a signed upload URL issued by the server. Sizes and MIME types
 * are re-validated server-side (never trust the client).
 *
 * extension: lowercase extension WITHOUT the dot (e.g. "stl").
 */
export interface QuoteFileDescriptor {
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  extension: string;
  fileType: "model" | "reference";
}

/**
 * TODO(M6 — pre-production hardening): antivirus / ZIP-scan verification of
 * uploaded model files belongs before the owner opens any file. Current plan
 * (documented, NOT implemented):
 *   1. server re-validates extension + declared size at signed-URL time;
 *   2. user uploads directly to the private bucket via signed URL;
 *   3. TODO(M6): scan the object (e.g. external AV service on Storage webhook
 *      or a scheduled function) and flip quote_files.status to 'quarantined'
 *      before the owner is allowed to download it from the admin panel.
 */