"use client";

/**
 * Site settings form (admin) — /admin/impostazioni.
 *
 * Upserts the site_settings rows via saveSiteSettings() (server-reverified).
 * accent_color has a live preview: a local wrapper applies the chosen value
 * to the --accent variable so the admin sees the brand color before saving.
 * UI text is Italian.
 */
import { useState, useTransition, type CSSProperties } from "react";
import { saveSiteSettings } from "@/app/actions/admin";
import { AdminAlert } from "./admin-ui";

export interface SettingsFormValues {
  notificationsEmail: string;
  accentColor: string;
  socialInstagram: string;
  socialTiktok: string;
  contactEmail: string;
  contactWhatsapp: string;
  materialsText: string;
  extensionsText: string;
  maxFileSizeMb: number;
}

const inputClass =
  "h-11 w-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-0";
const labelClass = "text-sm font-medium text-foreground";
const sectionClass = "flex flex-col gap-5 border border-border bg-surface p-6";

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [values, setValues] = useState<SettingsFormValues>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof SettingsFormValues>(key: K, value: SettingsFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const materials = values.materialsText
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const extensions = values.extensionsText
        .split(/[\s,]+/)
        .map((entry) => entry.trim().toLowerCase().replace(/^\./, ""))
        .filter(Boolean);
      const result = await saveSiteSettings({
        notificationsEmail: values.notificationsEmail,
        accentColor: values.accentColor,
        socialInstagram: values.socialInstagram,
        socialTiktok: values.socialTiktok,
        contactEmail: values.contactEmail,
        contactWhatsapp: values.contactWhatsapp,
        materials,
        allowedFileExtensions: extensions,
        maxFileSizeMb: values.maxFileSizeMb,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* -------- Notifications -------- */}
        <div className={sectionClass}>
          <h2 className="font-display text-base font-bold text-foreground">
            Email di notifica
          </h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-notif-email" className={labelClass}>
              Email destinataria delle notifiche (fase M4)
            </label>
            <input
              id="set-notif-email"
              type="email"
              value={values.notificationsEmail}
              onChange={(event) => set("notificationsEmail", event.target.value)}
              placeholder="notifiche@esempio.it"
              className={inputClass}
            />
            <p className="text-xs text-muted">
              Se vuota, il sistema userà RESEND_FROM_EMAIL come fallback.
            </p>
          </div>
        </div>

        {/* -------- Brand / accent -------- */}
        <div
          className={sectionClass}
          style={{ "--accent": values.accentColor } as CSSProperties}
        >
          <h2 className="font-display text-base font-bold text-foreground">
            Colore accent
          </h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-accent" className={labelClass}>
              Colore del sito (#RRGGBB)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="set-accent"
                type="color"
                value={values.accentColor}
                onChange={(event) => set("accentColor", event.target.value)}
                className="h-11 w-14 border border-border bg-background p-1"
              />
              <input
                type="text"
                value={values.accentColor}
                onChange={(event) => set("accentColor", event.target.value)}
                aria-label="Colore accent in formato esadecimale"
                pattern="^#[0-9a-fA-F]{6}$"
                className={`${inputClass} flex-1`}
              />
            </div>
          </div>
          {/* Live preview */}
          <div className="flex flex-col gap-3 border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Anteprima
            </p>
            <div className="flex items-center gap-3">
              <span className="bg-accent px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-background">
                Pulsante
              </span>
              <span className="text-accent">Testo evidenziato</span>
              <span className="ml-auto h-8 w-8 border border-border bg-accent" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* -------- Social -------- */}
        <div className={sectionClass}>
          <h2 className="font-display text-base font-bold text-foreground">
            Social ufficiali
          </h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-instagram" className={labelClass}>
              Instagram
            </label>
            <input
              id="set-instagram"
              type="url"
              value={values.socialInstagram}
              onChange={(event) => set("socialInstagram", event.target.value)}
              placeholder="https://instagram.com/…"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-tiktok" className={labelClass}>
              TikTok
            </label>
            <input
              id="set-tiktok"
              type="url"
              value={values.socialTiktok}
              onChange={(event) => set("socialTiktok", event.target.value)}
              placeholder="https://tiktok.com/@…"
              className={inputClass}
            />
          </div>
        </div>

        {/* -------- Contact -------- */}
        <div className={sectionClass}>
          <h2 className="font-display text-base font-bold text-foreground">
            Contatti pubblici
          </h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-contact-email" className={labelClass}>
              Email di contatto (mostrata sul sito)
            </label>
            <input
              id="set-contact-email"
              type="email"
              value={values.contactEmail}
              onChange={(event) => set("contactEmail", event.target.value)}
              placeholder="info@esempio.it"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-whatsapp" className={labelClass}>
              WhatsApp (formato internazionale, es. +39…)
            </label>
            <input
              id="set-whatsapp"
              type="tel"
              value={values.contactWhatsapp}
              onChange={(event) => set("contactWhatsapp", event.target.value)}
              placeholder="+39 000 000 0000"
              className={inputClass}
            />
          </div>
        </div>

        {/* -------- Materials -------- */}
        <div className={sectionClass}>
          <h2 className="font-display text-base font-bold text-foreground">
            Materiali offerti
          </h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-materials" className={labelClass}>
              Un materiale per riga
            </label>
            <textarea
              id="set-materials"
              rows={5}
              value={values.materialsText}
              onChange={(event) => set("materialsText", event.target.value)}
              placeholder={"PLA\nPETG\nABS\nResina"}
              className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* -------- Upload limits -------- */}
        <div className={sectionClass}>
          <h2 className="font-display text-base font-bold text-foreground">
            Limiti upload preventivo
          </h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-extensions" className={labelClass}>
              Estensioni consentite (separate da spazio o virgola)
            </label>
            <input
              id="set-extensions"
              type="text"
              value={values.extensionsText}
              onChange={(event) => set("extensionsText", event.target.value)}
              placeholder="stl obj 3mf zip"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="set-max-size" className={labelClass}>
              Dimensione massima per file (MB)
            </label>
            <input
              id="set-max-size"
              type="number"
              min={1}
              max={500}
              value={values.maxFileSizeMb}
              onChange={(event) =>
                set("maxFileSizeMb", Number(event.target.value))
              }
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
        {saved ? (
          <AdminAlert tone="success">Impostazioni salvate.</AdminAlert>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex h-12 w-full items-center justify-center bg-accent px-6 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Salvataggio…" : "Salva impostazioni"}
        </button>
      </div>
    </div>
  );
}