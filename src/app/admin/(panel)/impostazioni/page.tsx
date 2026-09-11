import { fetchSiteSettingsMap } from "@/lib/admin";
import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings";
import { SettingsForm, type SettingsFormValues } from "@/components/admin/SettingsForm";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-ui";

/**
 * /admin/impostazioni — site settings (upsert via saveSiteSettings server
 * action). Values shown come from site_settings merged over the defaults.
 */
export default async function AdminImpostazioniPage() {
  const result = await fetchSiteSettingsMap();

  if (result.status !== "ok") {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Impostazioni" />
        <AdminEmptyState
          title="Configurazione non disponibile"
          description="Le impostazioni non sono disponibili: completa la configurazione Supabase per modificarle."
        />
      </div>
    );
  }

  const settings = result.data;

  const initial: SettingsFormValues = {
    notificationsEmail: settings.notifications_email ?? "",
    accentColor: settings.accent_color ?? DEFAULT_SITE_SETTINGS.accentColor,
    socialInstagram:
      settings.social_instagram ?? DEFAULT_SITE_SETTINGS.socialInstagram,
    socialTiktok: settings.social_tiktok ?? DEFAULT_SITE_SETTINGS.socialTiktok,
    contactEmail: settings.contact_email ?? "",
    contactWhatsapp: settings.contact_whatsapp ?? "",
    materialsText: parseStringList(
      settings.materials,
      DEFAULT_SITE_SETTINGS.materials,
    ).join("\n"),
    extensionsText: parseStringList(
      settings.allowed_file_extensions,
      DEFAULT_SITE_SETTINGS.allowedFileExtensions,
    ).join(" "),
    maxFileSizeMb: parseNumber(settings.max_file_size_mb, DEFAULT_SITE_SETTINGS.maxFileSizeMb),
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Impostazioni"
        description="Configurazione generale del sito: notifiche, contatti, social, materiali e limiti upload. Le modifiche si applicano subito."
      />
      <SettingsForm initial={initial} />
    </div>
  );
}

function parseStringList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((entry) => typeof entry === "string")
    ) {
      return parsed.map(String);
    }
  } catch {
    // Malformed JSON: fallback.
  }
  return fallback;
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}