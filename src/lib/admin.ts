import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "./supabase/server-actions";

/**
 * Admin data layer (milestone M5) — SERVER ONLY.
 *
 * All reads here use the service-role client (RLS bypassed, see
 * src/lib/supabase/server-actions.ts): quote_requests / quote_files have no
 * policies for anon/authenticated, so the admin panel is the ONLY reader and
 * the service role is required. The route gate (middleware + panel layout +
 * getAdminSession) guarantees that only the admin reaches these pages.
 *
 * Degradation without credentials: every fetch returns
 * { status: "unavailable" } so pages render the honest "configurazione non
 * disponibile" empty state and the build stays green in CI.
 */

export type QuoteStatus =
  | "new"
  | "in_analysis"
  | "quote_sent"
  | "accepted"
  | "rejected"
  | "completed"
  | "archived";

export const QUOTE_STATUS_VALUES: readonly QuoteStatus[] = [
  "new",
  "in_analysis",
  "quote_sent",
  "accepted",
  "rejected",
  "completed",
  "archived",
] as const;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "Nuova",
  in_analysis: "In analisi",
  quote_sent: "Preventivo inviato",
  accepted: "Accettata",
  rejected: "Rifiutata",
  completed: "Completata",
  archived: "Archiviata",
};

/** Semantic token per status (see globals.css --status-*). */
export const QUOTE_STATUS_TONE: Record<
  QuoteStatus,
  "info" | "accent" | "success" | "warn" | "danger" | "muted"
> = {
  new: "accent",
  in_analysis: "info",
  quote_sent: "info",
  accepted: "success",
  rejected: "danger",
  completed: "success",
  archived: "muted",
};

export type QuoteFileStatus = "pending" | "uploaded" | "failed";

export const QUOTE_FILE_STATUS_LABELS: Record<QuoteFileStatus, string> = {
  pending: "In attesa di upload",
  uploaded: "Caricato",
  failed: "Non caricato",
};

/** Standard result of every admin fetch (honest tri-state). */
export type DataResult<T> =
  | { status: "unavailable" }
  | { status: "missing" }
  | { status: "ok"; data: T };

export function unavailable<T>(): DataResult<T> {
  return { status: "unavailable" };
}

// ------------------------------------------------------------------
// Quote requests
// ------------------------------------------------------------------

export interface QuoteRequestListItem {
  id: string;
  status: QuoteStatus;
  clientName: string;
  clientEmail: string;
  projectTitle: string;
  createdAt: string;
}

export interface QuoteRequestDetail extends QuoteRequestListItem {
  clientPhone: string | null;
  contactPreference: string;
  description: string;
  quantity: number;
  material: string | null;
  color: string | null;
  deadline: string | null;
  notes: string | null;
  has3dFile: boolean;
  driveLink: string | null;
  rightsConfirmed: boolean;
  privacyAccepted: boolean;
  adminNotes: string | null;
  updatedAt: string;
  files: QuoteFileRow[];
}

export interface QuoteFileRow {
  id: string;
  storagePath: string;
  originalName: string;
  fileType: "model" | "reference";
  mimeType: string | null;
  sizeBytes: number | null;
  status: QuoteFileStatus;
  createdAt: string;
}

interface QuoteRequestRow {
  id: string;
  status: QuoteStatus;
  client_name: string;
  client_email: string;
  project_title: string;
  created_at: string;
}

export async function fetchQuoteRequests(
  supabase?: SupabaseClient,
): Promise<DataResult<QuoteRequestListItem[]>> {
  const client = supabase ?? getAdminSupabaseClient();
  if (!client) return unavailable();

  const { data, error } = await client
    .from("quote_requests")
    .select(
      "id, status, client_name, client_email, project_title, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) return unavailable();
  if (!data) return { status: "ok", data: [] };

  return {
    status: "ok",
    data: (data as unknown as QuoteRequestRow[]).map((row) => ({
      id: row.id,
      status: row.status,
      clientName: row.client_name,
      clientEmail: row.client_email,
      projectTitle: row.project_title,
      createdAt: row.created_at,
    })),
  };
}

interface QuoteFileRowRaw {
  id: string;
  storage_path: string;
  original_name: string;
  file_type: "model" | "reference";
  mime_type: string | null;
  size_bytes: number | null;
  status: QuoteFileStatus;
  created_at: string;
}

export async function fetchQuoteRequestDetail(
  id: string,
): Promise<DataResult<QuoteRequestDetail>> {
  const client = getAdminSupabaseClient();
  if (!client) return unavailable();

  const { data: row, error } = await client
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return unavailable();
  if (!row) return { status: "missing" };

  const { data: fileRows } = await client
    .from("quote_files")
    .select("*")
    .eq("quote_request_id", id)
    .order("created_at", { ascending: true });

  const files = ((fileRows ?? []) as unknown as QuoteFileRowRaw[]).map(
    (file) => ({
      id: file.id,
      storagePath: file.storage_path,
      originalName: file.original_name,
      fileType: file.file_type,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      status: file.status,
      createdAt: file.created_at,
    }),
  );

  const r = row as unknown as QuoteRequestRow & {
    client_phone: string | null;
    contact_preference: string;
    description: string;
    quantity: number;
    material: string | null;
    color: string | null;
    deadline: string | null;
    notes: string | null;
    has_3d_file: boolean;
    drive_link: string | null;
    rights_confirmed: boolean;
    privacy_accepted: boolean;
    admin_notes: string | null;
    updated_at: string;
  };

  return {
    status: "ok",
    data: {
      id: r.id,
      status: r.status,
      clientName: r.client_name,
      clientEmail: r.client_email,
      projectTitle: r.project_title,
      createdAt: r.created_at,
      clientPhone: r.client_phone,
      contactPreference: r.contact_preference,
      description: r.description,
      quantity: r.quantity,
      material: r.material,
      color: r.color,
      deadline: r.deadline,
      notes: r.notes,
      has3dFile: r.has_3d_file,
      driveLink: r.drive_link,
      rightsConfirmed: r.rights_confirmed,
      privacyAccepted: r.privacy_accepted,
      adminNotes: r.admin_notes,
      updatedAt: r.updated_at,
      files,
    },
  };
}

// ------------------------------------------------------------------
// Gallery projects (admin view: published AND hidden)
// ------------------------------------------------------------------

export interface AdminProjectListItem {
  id: string;
  title: string;
  slug: string;
  serviceType: string | null;
  sortOrder: number;
  isPublished: boolean;
  coverUrl: string | null;
  coverAlt: string;
  updatedAt: string;
}

export interface AdminProjectDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  serviceType: string | null;
  material: string | null;
  sortOrder: number;
  isPublished: boolean;
  images: AdminImage[];
}

export interface AdminImage {
  id: string;
  storagePath: string;
  altText: string;
  sortOrder: number;
  isPublished: boolean;
  /** Public URL (gallery bucket is public; null when not configured). */
  url: string | null;
}

interface ProjectRowRaw {
  id: string;
  title: string;
  slug: string;
  service_type: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
}

interface ImageRowRaw {
  id: string;
  project_id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
  is_published: boolean;
}

function publicImageUrl(storagePath: string): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url}/storage/v1/object/public/gallery/${storagePath}`;
}

async function fetchAdminProjects(): Promise<
  DataResult<AdminProjectListItem[]>
> {
  const client = getAdminSupabaseClient();
  if (!client) return unavailable();

  const { data: projects, error } = await client
    .from("gallery_projects")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !projects) return unavailable();
  if (projects.length === 0) return { status: "ok", data: [] };

  const ids = projects.map((project) => project.id as string);
  const { data: images } = await client
    .from("gallery_images")
    .select("*")
    .in("project_id", ids)
    .order("sort_order", { ascending: true });

  const coverByProject = new Map<string, ImageRowRaw>();
  for (const image of (images ?? []) as unknown as ImageRowRaw[]) {
    if (!coverByProject.has(image.project_id)) {
      coverByProject.set(image.project_id, image);
    }
  }

  return {
    status: "ok",
    data: (projects as unknown as ProjectRowRaw[]).map((project) => {
      const cover = coverByProject.get(project.id);
      return {
        id: project.id,
        title: project.title,
        slug: project.slug,
        serviceType: project.service_type,
        sortOrder: project.sort_order,
        isPublished: project.is_published,
        coverUrl: cover ? publicImageUrl(cover.storage_path) : null,
        coverAlt: cover?.alt_text ?? project.title,
        updatedAt: project.updated_at,
      };
    }),
  };
}

export async function fetchAdminProjectsList(): Promise<
  DataResult<AdminProjectListItem[]>
> {
  return fetchAdminProjects();
}

export async function fetchAdminProjectDetail(
  id: string,
): Promise<DataResult<AdminProjectDetail>> {
  const client = getAdminSupabaseClient();
  if (!client) return unavailable();

  const { data: project, error } = await client
    .from("gallery_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return unavailable();
  if (!project) return { status: "missing" };

  const { data: images } = await client
    .from("gallery_images")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const p = project as unknown as ProjectRowRaw & {
    description: string | null;
    material: string | null;
  };

  return {
    status: "ok",
    data: {
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      serviceType: p.service_type,
      material: p.material,
      sortOrder: p.sort_order,
      isPublished: p.is_published,
      images: ((images ?? []) as unknown as ImageRowRaw[]).map((image) => ({
        id: image.id,
        storagePath: image.storage_path,
        altText: image.alt_text,
        sortOrder: image.sort_order,
        isPublished: image.is_published,
        url: publicImageUrl(image.storage_path),
      })),
    },
  };
}

// ------------------------------------------------------------------
// Site settings (admin view)
// ------------------------------------------------------------------

export type SiteSettingsMap = Record<string, string>;

export async function fetchSiteSettingsMap(): Promise<
  DataResult<SiteSettingsMap>
> {
  const client = getAdminSupabaseClient();
  if (!client) return unavailable();
  const { data, error } = await client
    .from("site_settings")
    .select("key, value");
  if (error || !data) return unavailable();
  const map: SiteSettingsMap = {};
  for (const row of data as unknown as { key: string; value: string | null }[]) {
    if (row.value != null) map[row.key] = row.value;
  }
  return { status: "ok", data: map };
}

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------

export interface DashboardData {
  total: number;
  countsByStatus: Partial<Record<QuoteStatus, number>>;
  latest: QuoteRequestListItem[];
}

export async function fetchDashboardData(): Promise<DataResult<DashboardData>> {
  const result = await fetchQuoteRequests();
  if (result.status !== "ok") return result;
  const total = result.data.length;
  const countsByStatus: Partial<Record<QuoteStatus, number>> = {};
  for (const request of result.data) {
    countsByStatus[request.status] = (countsByStatus[request.status] ?? 0) + 1;
  }
  return {
    status: "ok",
    data: {
      total,
      countsByStatus,
      latest: result.data.slice(0, 5),
    },
  };
}