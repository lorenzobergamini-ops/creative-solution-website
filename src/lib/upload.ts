import type { QuoteFileDescriptor } from "@/lib/validations/quote";

/**
 * Upload helpers shared by the client wizard and the server actions.
 * UI messages are Italian. The server side ALWAYS re-validates files:
 * the client checks (extensions, size) are UX only.
 */

/** Allowed extensions for a 3D model file (single model per request). */
export const ALLOWED_MODEL_EXTENSIONS = ["stl", "obj", "3mf", "zip"] as const;

/** Allowed MIME types for reference images (up to MAX_REFERENCE_FILES). */
export const ALLOWED_REFERENCE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Default maximum upload size per file, in MB. Overridable at runtime via the
 * `max_file_size_mb` row in `site_settings` (read server-side when issuing
 * signed URLs; the admin panel milestone will expose it in the UI).
 */
export const MAX_FILE_SIZE_MB = 50;

/** Maximum number of reference images per request. */
export const MAX_REFERENCE_FILES = 5;

/** Shape required for validation — a File object satisfies it. */
export interface UploadFileLike {
  name: string;
  size: number;
  type: string;
}

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Returns the lowercase extension of a filename WITHOUT the dot ("stl"). */
export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export interface UploadValidationOptions {
  maxSizeMb?: number;
  allowedExtensions?: readonly string[];
}

/**
 * Validates a file before upload. kind "model" checks the extension whitelist,
 * kind "reference" checks the MIME whitelist; both check the size limit.
 * Errors are user-facing Italian messages.
 */
export function validateUploadFile(
  file: UploadFileLike,
  kind: "model" | "reference" = "model",
  options: UploadValidationOptions = {},
): UploadValidationResult {
  const maxSizeMb = options.maxSizeMb ?? MAX_FILE_SIZE_MB;
  const allowedExtensions =
    options.allowedExtensions ?? ALLOWED_MODEL_EXTENSIONS;

  if (file.size <= 0) {
    return { ok: false, error: "Il file è vuoto." };
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return {
      ok: false,
      error: `Il file supera il limite di ${maxSizeMb} MB.`,
    };
  }

  if (kind === "model") {
    const ext = getFileExtension(file.name);
    if (!ext || !allowedExtensions.includes(ext)) {
      return {
        ok: false,
        error: `Estensione non consentita. Formati accettati: ${allowedExtensions
          .join(", ")
          .toUpperCase()}.`,
      };
    }
  } else {
    const mime = file.type.toLowerCase();
    if (!ALLOWED_REFERENCE_MIME.includes(mime as (typeof ALLOWED_REFERENCE_MIME)[number])) {
      return {
        ok: false,
        error: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF.",
      };
    }
  }

  return { ok: true };
}

/**
 * Storage path for an uploaded file: `quotes/{quoteRequestId}/{uuid}.{ext}`.
 * The ORIGINAL filename is deliberately NEVER used in the path (it may contain
 * spaces or path characters; the original name is kept only in the DB row).
 */
export function generateStoragePath(
  quoteRequestId: string,
  file: Pick<QuoteFileDescriptor, "originalName">,
): string {
  const ext = getFileExtension(file.originalName) || "bin";
  return `quotes/${quoteRequestId}/${crypto.randomUUID()}.${ext}`;
}