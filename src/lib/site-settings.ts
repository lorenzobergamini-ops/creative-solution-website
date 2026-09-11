import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/client";
import { getAdminSupabaseClient } from "./supabase/server-actions";

/**
 * Site settings — public-side values, configurable from the admin panel
 * (milestone M5) and stored in the `site_settings` table (see
 * supabase/migrations/0001_init.sql).
 *
 * getSiteSettings() merges the DB values OVER the defaults below, so the site
 * keeps working if a key is missing or Supabase is not configured. The DB
 * read uses the SERVICE-ROLE client (server-only): `site_settings` has no
 * anon read policy, and values like notifications_email must never reach the
 * client bundle. This module is imported only by Server Components.
 *
 * Without credentials (CI/build/local): no query is issued at all — defaults
 * are returned and the build stays green.
 */

export interface SiteSettings {
  /** Internal email used for admin notifications (M4). Empty until configured. */
  notificationsEmail: string;
  /** Brand accent color (hex). Applied on <html> by the root layout. */
  accentColor: string;
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
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  notificationsEmail: "",
  accentColor: "#38BDF8",
  contactEmail: "",
  contactWhatsapp: "",
  socialInstagram: "https://www.instagram.com/creativesolution.2024/",
  socialTiktok: "https://www.tiktok.com/@bergaminisamuele",
  materials: ["PLA", "PETG", "ABS", "Resina"],
  allowedFileExtensions: ["stl", "obj", "3mf", "zip"],
  maxFileSizeMb: 50,
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Reads the `site_settings` table and merges the values over the defaults.
 * Memoized per-request with React cache() (called by root layout, footer and
 * several pages in the same render) and returns defaults when Supabase is not
 * configured or the service role is missing (honest degradation).
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const merged: SiteSettings = { ...DEFAULT_SITE_SETTINGS };

  if (!isSupabaseConfigured()) {
    return merged;
  }
  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    // Public env vars present but service role missing: settings are only
    // readable with the service role (RLS), so fall back to defaults.
    return merged;
  }

  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error || !data) {
    return merged;
  }

  for (const row of data as unknown as { key: string; value: string | null }[]) {
    if (row.value == null) continue;
    const value = row.value;
    switch (row.key) {
      case "notifications_email":
        merged.notificationsEmail = value;
        break;
      case "accent_color":
        if (HEX_COLOR_PATTERN.test(value)) merged.accentColor = value;
        break;
      case "contact_email":
        merged.contactEmail = value;
        break;
      case "contact_whatsapp":
        merged.contactWhatsapp = value;
        break;
      case "social_instagram":
        merged.socialInstagram = value;
        break;
      case "social_tiktok":
        merged.socialTiktok = value;
        break;
      case "materials": {
        try {
          const parsed: unknown = JSON.parse(value);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((entry) => typeof entry === "string")
          ) {
            merged.materials = parsed.map(String);
          }
        } catch {
          // Malformed JSON: keep defaults.
        }
        break;
      }
      case "allowed_file_extensions": {
        try {
          const parsed: unknown = JSON.parse(value);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((entry) => typeof entry === "string")
          ) {
            merged.allowedFileExtensions = parsed.map((entry) =>
              String(entry).toLowerCase(),
            );
          }
        } catch {
          // Malformed JSON: keep defaults.
        }
        break;
      }
      case "max_file_size_mb": {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 500) {
          merged.maxFileSizeMb = parsed;
        }
        break;
      }
      default:
        break;
    }
  }

  return merged;
});