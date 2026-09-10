/**
 * Site settings — public-side defaults.
 *
 * These values are configurable from the admin panel (Phase M2+/admin) and
 * stored in the `site_settings` table (see supabase/migrations/0001_init.sql).
 * Until the database connection is wired up, the pages read these defaults via
 * `getSiteSettings()`.
 */

export interface SiteSettings {
  /** Contact email displayed on the site. Empty until configured in the admin panel. */
  contactEmail: string;
  /** WhatsApp contact (phone number in international format). Empty until configured. */
  contactWhatsapp: string;
  /** Official social links. */
  socialInstagram: string;
  socialTiktok: string;
  /** Materials currently offered (free-form labels, shown on /servizi). */
  materials: string[];
  /** Allowed file extensions for the quote-form upload (Phase M3). */
  allowedFileExtensions: string[];
  /** Max upload size, in MB, for the quote-form upload (Phase M3). */
  maxFileSizeMb: number;
}

/**
 * Default settings. Mirrors the seed rows in supabase/migrations/0001_init.sql.
 *
 * TODO(M2): read these from the `site_settings` table (server-side, via
 * service role) once the admin panel is connected, then merge the DB values
 * over these defaults so the site stays functional if a key is missing.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  contactEmail: "",
  contactWhatsapp: "",
  socialInstagram: "https://www.instagram.com/creativesolution.2024/",
  socialTiktok: "https://www.tiktok.com/@bergaminisamuele",
  materials: ["PLA", "PETG", "ABS", "Resina"],
  allowedFileExtensions: ["stl", "obj", "3mf", "zip"],
  maxFileSizeMb: 50,
};

/**
 * Returns the current site settings.
 *
 * TODO(M2): fetch from Supabase `site_settings` (server-only, service role)
 * and merge over DEFAULT_SITE_SETTINGS. Until then, defaults are used.
 */
export function getSiteSettings(): SiteSettings {
  return DEFAULT_SITE_SETTINGS;
}