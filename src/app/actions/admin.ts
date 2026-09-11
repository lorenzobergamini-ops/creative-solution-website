"use server";

/**
 * Admin panel server actions (milestone M5).
 *
 * SECURITY MODEL — every action starts with requireAdmin():
 *   1. session verified via getAdminSession() (getUser() against the auth
 *      server + cookie session, never trusted from the client);
 *   2. profiles.role='admin' verified server-side;
 *   3. all DB/storage operations use the service-role client, which never
 *      reaches the client bundle.
 * Any violation returns a clear Italian error. Degradation without
 * credentials: every action returns CONFIG_UNAVAILABLE_MESSAGE and the build
 * stays green in CI (no env vars).
 */

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/supabase/admin-session";
import {
  CONFIG_UNAVAILABLE_MESSAGE,
  getAdminSupabaseClient,
} from "@/lib/supabase/server-actions";
import {
  QUOTE_STATUS_VALUES,
  type QuoteStatus,
} from "@/lib/admin";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

export type ActionWithData<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

type AdminContext = { supabase: SupabaseClient };

async function requireAdmin(): Promise<
  { ok: true; ctx: AdminContext } | { ok: false; error: string; code?: string }
> {
  const { configured, userId, isAdmin } = await getAdminSession();
  if (!configured) {
    return { ok: false, error: CONFIG_UNAVAILABLE_MESSAGE, code: "config" };
  }
  if (!userId || !isAdmin) {
    return {
      ok: false,
      error:
        "Non autorizzato. Accedi con un account amministratore e riprova.",
      code: "unauthorized",
    };
  }
  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    return { ok: false, error: CONFIG_UNAVAILABLE_MESSAGE, code: "config" };
  }
  return { ok: true, ctx: { supabase } };
}

// ------------------------------------------------------------------
// Quote requests — status, notes, signed download URL
// ------------------------------------------------------------------

export async function updateQuoteStatus(
  requestId: string,
  status: string,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  if (typeof requestId !== "string" || requestId.length === 0) {
    return { ok: false, error: "Richiesta non valida.", code: "validation" };
  }
  if (!QUOTE_STATUS_VALUES.includes(status as QuoteStatus)) {
    return { ok: false, error: "Stato non valido.", code: "validation" };
  }

  const { error } = await supabase
    .from("quote_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) {
    return {
      ok: false,
      error: "Aggiornamento dello stato non riuscito. Riprova.",
      code: "db",
    };
  }

  revalidatePath("/admin/richieste");
  revalidatePath("/admin/richieste/[id]");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateAdminNotes(
  requestId: string,
  notes: string,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  if (typeof requestId !== "string" || requestId.length === 0) {
    return { ok: false, error: "Richiesta non valida.", code: "validation" };
  }
  const trimmed = typeof notes === "string" ? notes.trim() : "";
  if (trimmed.length > 5000) {
    return {
      ok: false,
      error: "Le note non possono superare 5000 caratteri.",
      code: "validation",
    };
  }

  const { error } = await supabase
    .from("quote_requests")
    .update({ admin_notes: trimmed.length === 0 ? null : trimmed })
    .eq("id", requestId);
  if (error) {
    return {
      ok: false,
      error: "Salvataggio delle note non riuscito. Riprova.",
      code: "db",
    };
  }

  revalidatePath("/admin/richieste/[id]");
  return { ok: true };
}

/**
 * Generates a 5-minute signed URL for a quote file and returns it. The
 * client navigates to it (download). The bucket 'quote-files' is private:
 * no public URL is ever produced — only this server action can mint URLs.
 */
export async function getQuoteFileSignedUrl(
  fileId: string,
): Promise<ActionWithData<{ url: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  if (typeof fileId !== "string" || fileId.length === 0) {
    return { ok: false, error: "File non valido.", code: "validation" };
  }

  const { data: file, error } = await supabase
    .from("quote_files")
    .select("id, storage_path, status")
    .eq("id", fileId)
    .maybeSingle();
  if (error || !file) {
    return { ok: false, error: "File non trovato.", code: "not_found" };
  }
  if (file.status !== "uploaded") {
    return {
      ok: false,
      error: "Il file non è stato caricato: download non disponibile.",
      code: "not_uploaded",
    };
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("quote-files")
    .createSignedUrl(file.storage_path, 5 * 60);
  if (signedError || !signed) {
    return {
      ok: false,
      error: "Impossibile generare il link di download. Riprova.",
      code: "storage",
    };
  }

  return { ok: true, data: { url: signed.signedUrl } };
}

// ------------------------------------------------------------------
// Gallery projects — CRUD + publish toggle
// ------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "progetto";
}

async function uniqueSlug(
  supabase: SupabaseClient,
  baseSlug: string,
  excludeId?: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    let query = supabase
      .from("gallery_projects")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (excludeId) {
      query = supabase
        .from("gallery_projects")
        .select("id")
        .eq("slug", candidate)
        .neq("id", excludeId)
        .maybeSingle();
    }
    const { data, error } = await query;
    if (error) return null;
    if (!data) return candidate;
  }
  return null;
}

export interface ProjectInput {
  title: string;
  slug?: string;
  description?: string | null;
  serviceType?: string | null;
  material?: string | null;
  sortOrder: number;
  isPublished: boolean;
}

const PROJECT_SERVICE_TYPES = [
  "fdm_print",
  "resin_print",
  "custom_parts",
  "prototypes",
  "design_3d",
  "other",
] as const;

function validateProjectInput(input: ProjectInput): string | null {
  if (!input || typeof input.title !== "string") {
    return "Titolo non valido.";
  }
  const title = input.title.trim();
  if (title.length === 0 || title.length > 120) {
    return "Il titolo deve avere tra 1 e 120 caratteri.";
  }
  if (input.slug != null && input.slug.length > 0) {
    if (!SLUG_PATTERN.test(input.slug)) {
      return "Lo slug può contenere solo lettere minuscole, numeri e trattini.";
    }
  }
  if (
    input.serviceType != null &&
    !PROJECT_SERVICE_TYPES.includes(
      input.serviceType as (typeof PROJECT_SERVICE_TYPES)[number],
    )
  ) {
    return "Categoria di servizio non valida.";
  }
  if (input.sortOrder == null || !Number.isFinite(input.sortOrder)) {
    return "Ordinamento non valido.";
  }
  const order = Math.trunc(input.sortOrder);
  if (order < -9999 || order > 9999) {
    return "Ordinamento fuori intervallo.";
  }
  return null;
}

export async function createProject(
  raw: ProjectInput,
): Promise<ActionWithData<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  const invalid = validateProjectInput(raw);
  if (invalid) return { ok: false, error: invalid, code: "validation" };

  const title = raw.title.trim();
  const baseSlug = (raw.slug?.trim() || slugifyTitle(title)).toLowerCase();
  const slug = await uniqueSlug(supabase, baseSlug);
  if (!slug) {
    return {
      ok: false,
      error: "Impossibile generare uno slug univoco. Riprova.",
      code: "slug",
    };
  }

  const { data, error } = await supabase
    .from("gallery_projects")
    .insert({
      title,
      slug,
      description: raw.description?.trim() || null,
      service_type: raw.serviceType || null,
      material: raw.material?.trim() || null,
      sort_order: Math.trunc(raw.sortOrder),
      is_published: raw.isPublished,
    })
    .select("id")
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: "Creazione del progetto non riuscita. Riprova.",
      code: "db",
    };
  }

  revalidatePath("/admin/galleria");
  revalidatePath("/admin/galleria/[id]");
  revalidatePath("/galleria");
  revalidatePath("/");
  return { ok: true, data: { id: data.id as string } };
}

export async function updateProject(
  projectId: string,
  raw: ProjectInput,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  if (typeof projectId !== "string" || projectId.length === 0) {
    return { ok: false, error: "Progetto non valido.", code: "validation" };
  }
  const invalid = validateProjectInput(raw);
  if (invalid) return { ok: false, error: invalid, code: "validation" };

  const title = raw.title.trim();
  const baseSlug = (raw.slug?.trim() || slugifyTitle(title)).toLowerCase();
  const slug = await uniqueSlug(supabase, baseSlug, projectId);
  if (!slug) {
    return {
      ok: false,
      error: "Impossibile generare uno slug univoco. Riprova.",
      code: "slug",
    };
  }

  const { error } = await supabase
    .from("gallery_projects")
    .update({
      title,
      slug,
      description: raw.description?.trim() || null,
      service_type: raw.serviceType || null,
      material: raw.material?.trim() || null,
      sort_order: Math.trunc(raw.sortOrder),
      is_published: raw.isPublished,
    })
    .eq("id", projectId);
  if (error) {
    return {
      ok: false,
      error: "Salvataggio del progetto non riuscito. Riprova.",
      code: "db",
    };
  }

  revalidatePath("/admin/galleria");
  revalidatePath("/admin/galleria/[id]");
  revalidatePath("/galleria");
  revalidatePath("/galleria/[slug]");
  revalidatePath("/");
  return { ok: true };
}

export async function setProjectPublished(
  projectId: string,
  published: boolean,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  if (typeof projectId !== "string" || projectId.length === 0) {
    return { ok: false, error: "Progetto non valido.", code: "validation" };
  }

  const { error } = await supabase
    .from("gallery_projects")
    .update({ is_published: Boolean(published) })
    .eq("id", projectId);
  if (error) {
    return {
      ok: false,
      error: "Aggiornamento dello stato non riuscito. Riprova.",
      code: "db",
    };
  }

  revalidatePath("/admin/galleria");
  revalidatePath("/galleria");
  revalidatePath("/");
  return { ok: true };
}

/** Deletes a project: DB row (gallery_images cascade) + storage folder. */
export async function deleteProject(projectId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  if (typeof projectId !== "string" || projectId.length === 0) {
    return { ok: false, error: "Progetto non valido.", code: "validation" };
  }

  // Best-effort storage cleanup (never fail the delete because of it).
  const folder = `gallery/${projectId}`;
  const { data: objects } = await supabase.storage
    .from("gallery")
    .list(folder, { limit: 200 });
  const paths = (objects ?? [])
    .map((object) => `${folder}/${object.name}`)
    .filter((path) => !path.endsWith("/"));
  if (paths.length > 0) {
    await supabase.storage.from("gallery").remove(paths);
  }

  const { error } = await supabase
    .from("gallery_projects")
    .delete()
    .eq("id", projectId);
  if (error) {
    return {
      ok: false,
      error: "Eliminazione del progetto non riuscita. Riprova.",
      code: "db",
    };
  }

  revalidatePath("/admin/galleria");
  revalidatePath("/galleria");
  revalidatePath("/");
  return { ok: true };
}

// ------------------------------------------------------------------
// Gallery images — server-side upload with service role
// ------------------------------------------------------------------

function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Uploads ONE gallery image server-side (service role → public bucket
 * 'gallery'), path gallery/{projectId}/{uuid}.{ext}. The project must exist.
 * Accepts FormData: projectId, altText, file.
 */
export async function uploadGalleryImage(
  formData: FormData,
): Promise<ActionWithData<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  const projectId = String(formData.get("projectId") ?? "");
  const altText = String(formData.get("altText") ?? "").trim();
  const file = formData.get("file");

  if (!projectId || !(file instanceof File)) {
    return { ok: false, error: "Dati immagine non validi.", code: "validation" };
  }
  if (altText.length > 300) {
    return {
      ok: false,
      error: "Il testo alternativo non può superare 300 caratteri.",
      code: "validation",
    };
  }
  if (file.size <= 0) {
    return { ok: false, error: "Il file è vuoto.", code: "validation" };
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return {
      ok: false,
      error: `L'immagine supera il limite di ${MAX_IMAGE_SIZE_MB} MB.`,
      code: "validation",
    };
  }
  const mime = file.type.toLowerCase();
  const ext = getFileExtension(file.name);
  if (
    !ALLOWED_IMAGE_MIME.has(mime) ||
    !IMAGE_EXTENSIONS[ext] ||
    IMAGE_EXTENSIONS[ext] !== mime
  ) {
    return {
      ok: false,
      error: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF.",
      code: "validation",
    };
  }

  // The project must exist.
  const { data: project } = await supabase
    .from("gallery_projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: "Progetto non trovato.", code: "not_found" };
  }

  // Next sort_order = max + 1.
  const { data: maxRow } = await supabase
    .from("gallery_images")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (maxRow?.sort_order as number | undefined ?? -1) + 1;

  const storagePath = `gallery/${projectId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("gallery")
    .upload(storagePath, file, {
      contentType: mime,
      upsert: false,
    });
  if (uploadError) {
    return {
      ok: false,
      error: "Upload dell'immagine non riuscito. Riprova.",
      code: "storage",
    };
  }

  const { data: row, error: insertError } = await supabase
    .from("gallery_images")
    .insert({
      project_id: projectId,
      storage_path: storagePath,
      alt_text: altText,
      sort_order: sortOrder,
      is_published: true,
    })
    .select("id")
    .single();
  if (insertError || !row) {
    // Roll back the object so we never keep an orphan file.
    await supabase.storage.from("gallery").remove([storagePath]);
    return {
      ok: false,
      error: "Salvataggio dell'immagine non riuscito. Riprova.",
      code: "db",
    };
  }

  revalidatePath("/admin/galleria");
  revalidatePath("/admin/galleria/[id]");
  revalidatePath("/galleria");
  revalidatePath("/");
  return { ok: true, data: { id: row.id as string } };
}

/** Removes a gallery image (DB row + storage object). */
export async function removeGalleryImage(
  imageId: string,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  if (typeof imageId !== "string" || imageId.length === 0) {
    return { ok: false, error: "Immagine non valida.", code: "validation" };
  }

  const { data: image } = await supabase
    .from("gallery_images")
    .select("id, storage_path")
    .eq("id", imageId)
    .maybeSingle();
  if (!image) {
    return { ok: false, error: "Immagine non trovata.", code: "not_found" };
  }

  const { error: deleteError } = await supabase
    .from("gallery_images")
    .delete()
    .eq("id", imageId);
  if (deleteError) {
    return {
      ok: false,
      error: "Eliminazione dell'immagine non riuscita. Riprova.",
      code: "db",
    };
  }
  // Best-effort object removal.
  await supabase.storage.from("gallery").remove([image.storage_path]);

  revalidatePath("/admin/galleria");
  revalidatePath("/admin/galleria/[id]");
  revalidatePath("/galleria");
  revalidatePath("/");
  return { ok: true };
}

// ------------------------------------------------------------------
// Site settings — upsert from the admin form
// ------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const URL_PATTERN = /^https:\/\/\S+$/;

export interface SiteSettingsInput {
  notificationsEmail: string;
  accentColor: string;
  socialInstagram: string;
  socialTiktok: string;
  contactEmail: string;
  contactWhatsapp: string;
  materials: string[];
  allowedFileExtensions: string[];
  maxFileSizeMb: number;
}

function optionalUrl(value: string): boolean {
  return value.trim().length === 0 || URL_PATTERN.test(value.trim());
}

export async function saveSiteSettings(
  raw: SiteSettingsInput,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Dati non validi.", code: "validation" };
  }

  const notificationsEmail = String(raw.notificationsEmail ?? "").trim();
  if (
    notificationsEmail.length > 0 &&
    !EMAIL_PATTERN.test(notificationsEmail)
  ) {
    return {
      ok: false,
      error: "Email di notifica non valida.",
      code: "validation",
    };
  }
  const contactEmail = String(raw.contactEmail ?? "").trim();
  if (contactEmail.length > 0 && !EMAIL_PATTERN.test(contactEmail)) {
    return {
      ok: false,
      error: "Email di contatto non valida.",
      code: "validation",
    };
  }
  const accentColor = String(raw.accentColor ?? "").trim();
  if (!HEX_COLOR_PATTERN.test(accentColor)) {
    return {
      ok: false,
      error: "Colore accent non valido: usa la notazione esadecimale (#RRGGBB).",
      code: "validation",
    };
  }
  const socialInstagram = String(raw.socialInstagram ?? "").trim();
  const socialTiktok = String(raw.socialTiktok ?? "").trim();
  const contactWhatsapp = String(raw.contactWhatsapp ?? "").trim();
  if (
    !optionalUrl(socialInstagram) ||
    !optionalUrl(socialTiktok) ||
    (contactWhatsapp.length > 0 &&
      !/^\+[0-9]{6,15}$/.test(contactWhatsapp.replace(/[\s-]/g, "")))
  ) {
    return {
      ok: false,
      error: "Link o numero non validi (i numeri WhatsApp usano il formato +39...).",
      code: "validation",
    };
  }

  const materials = (Array.isArray(raw.materials) ? raw.materials : [])
    .map((m) => String(m).trim())
    .filter((m) => m.length > 0)
    .slice(0, 30);
  if (materials.length === 0) {
    return {
      ok: false,
      error: "Inserisci almeno un materiale.",
      code: "validation",
    };
  }
  const allowedFileExtensions = (
    Array.isArray(raw.allowedFileExtensions)
      ? raw.allowedFileExtensions
      : []
  )
    .map((e) => String(e).trim().toLowerCase().replace(/^\./, ""))
    .filter((e) => /^[a-z0-9]{1,10}$/.test(e))
    .slice(0, 20);
  if (allowedFileExtensions.length === 0) {
    return {
      ok: false,
      error: "Inserisci almeno un'estensione di file consentita.",
      code: "validation",
    };
  }
  const maxFileSizeMb = Number(raw.maxFileSizeMb);
  if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb < 1 || maxFileSizeMb > 500) {
    return {
      ok: false,
      error: "La dimensione massima deve essere tra 1 e 500 MB.",
      code: "validation",
    };
  }

  const rows = [
    { key: "notifications_email", value: notificationsEmail },
    { key: "accent_color", value: accentColor },
    { key: "social_instagram", value: socialInstagram },
    { key: "social_tiktok", value: socialTiktok },
    { key: "contact_email", value: contactEmail },
    { key: "contact_whatsapp", value: contactWhatsapp },
    { key: "materials", value: JSON.stringify(materials) },
    {
      key: "allowed_file_extensions",
      value: JSON.stringify(allowedFileExtensions),
    },
    { key: "max_file_size_mb", value: String(Math.trunc(maxFileSizeMb)) },
  ];

  const { error } = await supabase.from("site_settings").upsert(rows, {
    onConflict: "key",
  });
  if (error) {
    return {
      ok: false,
      error: "Salvataggio delle impostazioni non riuscito. Riprova.",
      code: "db",
    };
  }

  revalidatePath("/admin/impostazioni");
  return { ok: true };
}

// Keep the import used for type clarity (also re-exported for the UI).
export type { QuoteStatus };