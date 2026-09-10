import {
  getPublicGalleryImageUrl,
  getSupabaseServerClient,
} from "./supabase/server";

/**
 * Gallery data access layer (M2).
 *
 * Reads the PUBLIC gallery content from Supabase using the anon key + RLS:
 * only published projects and published images are ever visible.
 *
 * Graceful degradation: when Supabase is not configured (no NEXT_PUBLIC_*
 * vars), every function returns an empty result WITHOUT throwing, so the
 * build stays green in CI and the UI renders honest empty states
 * ("Nessun progetto pubblicato ancora").
 *
 * TODO(M6, production): remove the "not configured" early returns once real
 * credentials are always present in every environment (Vercel + local dev).
 */

export type ServiceType =
  | "fdm_print"
  | "resin_print"
  | "custom_parts"
  | "prototypes"
  | "design_3d"
  | "other";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  fdm_print: "Stampa FDM",
  resin_print: "Stampa in resina",
  custom_parts: "Pezzi personalizzati",
  prototypes: "Prototipi",
  design_3d: "Progettazione 3D",
  other: "Altro",
};

export interface GalleryImage {
  /** Full public URL of the storage object, or null when not available. */
  url: string | null;
  altText: string;
}

export interface GalleryProject {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  serviceType: ServiceType | null;
  /** Human-readable category label (from SERVICE_TYPE_LABELS). */
  category: string | null;
  material: string | null;
  /** First published image of the project (cover), or null. */
  coverUrl: string | null;
  coverAlt: string;
  /** All published images of the project, ordered by sort_order. */
  images: GalleryImage[];
}

interface ProjectRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  service_type: ServiceType | null;
  material: string | null;
}

interface ImageRow {
  project_id: string;
  storage_path: string;
  alt_text: string | null;
}

const MAX_LIST_DESCRIPTION_LENGTH = 160;

/** Truncate a description to a word boundary for list cards. */
function truncateDescription(description: string | null): string | null {
  if (!description) return null;
  if (description.length <= MAX_LIST_DESCRIPTION_LENGTH) return description;
  const cut = description.slice(0, MAX_LIST_DESCRIPTION_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : MAX_LIST_DESCRIPTION_LENGTH)}…`;
}

/** Fetch all projects and their published images in one pass (2 queries). */
async function fetchPublishedProjects(): Promise<GalleryProject[]> {
  const client = getSupabaseServerClient();
  // TODO(M6): remove this fallback — see header comment.
  if (!client) return [];

  const { data: projectRows, error } = await client
    .from("gallery_projects")
    .select("id, title, slug, description, service_type, material")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error || !projectRows || projectRows.length === 0) return [];

  const projectIds = projectRows.map((project) => project.id as string);

  const { data: imageRows } = await client
    .from("gallery_images")
    .select("project_id, storage_path, alt_text")
    .eq("is_published", true)
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  const imagesByProject = new Map<string, GalleryImage[]>();
  for (const row of (imageRows ?? []) as unknown as ImageRow[]) {
    const images = imagesByProject.get(row.project_id) ?? [];
    images.push({
      url: getPublicGalleryImageUrl(row.storage_path),
      altText: row.alt_text || "",
    });
    imagesByProject.set(row.project_id, images);
  }

  return (projectRows as unknown as ProjectRow[]).map((project) => {
    const images = imagesByProject.get(project.id) ?? [];
    const cover = images[0] ?? null;
    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      description: truncateDescription(project.description),
      serviceType: project.service_type,
      category: project.service_type
        ? (SERVICE_TYPE_LABELS[project.service_type] ?? "Altro")
        : null,
      material: project.material,
      coverUrl: cover?.url ?? null,
      coverAlt: cover?.altText || project.title,
      images,
    };
  });
}

/** All published projects, ordered by sort_order (for /galleria). */
export async function getPublishedProjects(): Promise<GalleryProject[]> {
  return fetchPublishedProjects();
}

/** Latest published projects for the home page ("Lavori recenti"). */
export async function getLatestProjects(limit = 6): Promise<GalleryProject[]> {
  const projects = await fetchPublishedProjects();
  return projects.slice(0, limit);
}

/** A single published project by slug, with its full description (detail page). */
export async function getProjectBySlug(
  slug: string,
): Promise<GalleryProject | null> {
  const client = getSupabaseServerClient();
  // TODO(M6): remove this fallback — see header comment.
  if (!client) return null;

  const { data: projectRow, error } = await client
    .from("gallery_projects")
    .select("id, title, slug, description, service_type, material")
    .eq("is_published", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !projectRow) return null;

  const project = projectRow as unknown as ProjectRow;

  const { data: imageRows } = await client
    .from("gallery_images")
    .select("project_id, storage_path, alt_text")
    .eq("project_id", project.id)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  const images = ((imageRows ?? []) as unknown as ImageRow[]).map((row) => ({
    url: getPublicGalleryImageUrl(row.storage_path),
    altText: row.alt_text || "",
  }));
  const cover = images[0] ?? null;

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    description: project.description,
    serviceType: project.service_type,
    category: project.service_type
      ? (SERVICE_TYPE_LABELS[project.service_type] ?? "Altro")
      : null,
    material: project.material,
    coverUrl: cover?.url ?? null,
    coverAlt: cover?.altText || project.title,
    images,
  };
}