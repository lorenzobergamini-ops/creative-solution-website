import { Resend } from "resend";

import { isSupabaseConfigured } from "./supabase/client";
import { getAdminSupabaseClient } from "./supabase/server-actions";

/**
 * Resend transactional emails (milestone M4).
 *
 * Server-only module: imported exclusively from the "use server" actions
 * (src/app/actions/quote.ts). RESEND_API_KEY / RESEND_FROM_EMAIL are server
 * env vars and never reach the client bundle.
 *
 * Security/scope rules:
 *  - NO attachments, ever. 3D files uploaded through the quote form stay in
 *    the private Supabase bucket; emails only carry IDs/links.
 *  - The admin link points to the private /admin/richieste/{id} page (the
 *    files are downloaded through 5-minute signed URLs, never public URLs).
 *  - Every user-provided value is HTML-escaped before being interpolated in
 *    the templates (escapeHtml) — raw input is never injected into the HTML.
 *
 * Degradation: if Resend is not configured (missing RESEND_API_KEY or
 * RESEND_FROM_EMAIL) every send returns { ok: false, reason: "not-configured" }
 * after a console.log; callers must never throw and never block the user on
 * email failures (the quote flow wraps sends in try/catch).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Email-facing subset of a quote request. Built server-side in
 * src/app/actions/quote.ts right after the request is saved, so it can be
 * sent even for requests without uploaded files (the wizard only calls
 * completeQuoteUpload when files exist — this module must not depend on it).
 */
export interface QuoteEmailData {
  quoteRequestId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  contactPreference: string;
  projectTitle: string;
  description: string;
  quantity: number;
  material?: string;
  color?: string;
  deadline?: string;
  notes?: string;
  has3dFile: boolean;
  driveLink?: string;
}

export type EmailSendResult =
  | { ok: true; id?: string }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Brand tokens (inline-styled HTML templates, no external assets)
// ---------------------------------------------------------------------------

const BRAND = {
  bg: "#14161B",
  card: "#1D2027",
  border: "#2A2E38",
  text: "#F5F1E8",
  muted: "#A8ADBB",
  accent: "#C8F031",
} as const;

const CONTACT_PREFERENCE_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefono",
  whatsapp: "WhatsApp",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape a value for safe interpolation inside HTML templates. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

function truncate(value: string, max = 500): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function contactPreferenceLabel(value: string): string {
  return CONTACT_PREFERENCE_LABELS[value] ?? value;
}

function shortReference(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// Lazy Resend client (module-level singleton; null when not configured)
// ---------------------------------------------------------------------------

let cachedResend: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (cachedResend !== undefined) return cachedResend;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.log(
      "[emails] Resend not configured (RESEND_API_KEY / RESEND_FROM_EMAIL missing) — skipping transactional emails",
    );
    cachedResend = null;
    return null;
  }
  cachedResend = new Resend(apiKey);
  return cachedResend;
}

// ---------------------------------------------------------------------------
// Site settings needed by the emails (direct service-role read, no React
// cache — senders run inside server actions where request scope may differ)
// ---------------------------------------------------------------------------

interface EmailSiteSettings {
  notificationsEmail: string;
  socialInstagram: string;
  socialTiktok: string;
}

async function getEmailSiteSettings(): Promise<EmailSiteSettings> {
  const defaults: EmailSiteSettings = {
    notificationsEmail: "",
    socialInstagram: "https://www.instagram.com/creativesolution.2024/",
    socialTiktok: "https://www.tiktok.com/@bergaminisamuele",
  };
  // Mirrors the defaults in src/lib/site-settings.ts / 0001_init.sql.
  if (!isSupabaseConfigured()) return defaults;
  const supabase = getAdminSupabaseClient();
  if (!supabase) return defaults;

  const { data } = await supabase.from("site_settings").select("key, value");
  if (!data) return defaults;

  const merged: EmailSiteSettings = { ...defaults };
  for (const row of data as unknown as { key: string; value: string | null }[]) {
    if (row.value == null || row.value.length === 0) continue;
    if (row.key === "notifications_email") merged.notificationsEmail = row.value;
    else if (row.key === "social_instagram") merged.socialInstagram = row.value;
    else if (row.key === "social_tiktok") merged.socialTiktok = row.value;
  }
  return merged;
}

// ---------------------------------------------------------------------------
// HTML templates (inline styles, brand dark + lime accent)
// ---------------------------------------------------------------------------

interface ShellOptions {
  kicker: string;
  heading: string;
  bodyHtml: string;
  footerHtml: string;
}

function renderShell({ kicker, heading, bodyHtml, footerHtml }: ShellOptions): string {
  return `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BRAND.bg};color:${BRAND.text};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND.accent};padding:16px 24px;">
                <p style="margin:0;font-size:15px;font-weight:bold;color:${BRAND.bg};letter-spacing:1.5px;text-transform:uppercase;">Creative Solution</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:${BRAND.accent};letter-spacing:1px;text-transform:uppercase;">${escapeHtml(kicker)}</p>
                <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${BRAND.text};font-weight:bold;">${escapeHtml(heading)}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:12px;color:${BRAND.muted};line-height:1.6;">${footerHtml}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function fieldRow(label: string, value: string): string {
  return `<div style="margin:0 0 14px;">
    <p style="margin:0 0 2px;font-size:11px;font-weight:bold;color:${BRAND.muted};letter-spacing:0.8px;text-transform:uppercase;">${escapeHtml(label)}</p>
    <p style="margin:0;font-size:15px;color:${BRAND.text};line-height:1.5;word-break:break-word;">${escapeHtml(value)}</p>
  </div>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:4px;padding:12px 20px;background-color:${BRAND.accent};color:${BRAND.bg};font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>`;
}

// ---------------------------------------------------------------------------
// Send functions
// ---------------------------------------------------------------------------

/**
 * Notification to the admin when a new quote request arrives.
 * Recipient: site_settings.notifications_email if set, else RESEND_FROM_EMAIL.
 */
export async function sendAdminNewQuoteNotification(
  quote: QuoteEmailData,
): Promise<EmailSendResult> {
  const resend = getResendClient();
  if (!resend) return { ok: false, reason: "not-configured" };

  const settings = await getEmailSiteSettings();
  const from = process.env.RESEND_FROM_EMAIL ?? "";
  const to = settings.notificationsEmail.trim() || from;

  const subject = `Nuova richiesta di preventivo — ${quote.projectTitle}`;
  const ref = shortReference(quote.quoteRequestId);
  const dashboardPath = `/admin/richieste/${quote.quoteRequestId}`;
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}${dashboardPath}`
    : dashboardPath;

  const bodyHtml = [
    fieldRow("Titolo progetto", quote.projectTitle),
    fieldRow("Cliente", quote.clientName),
    fieldRow("Email cliente", quote.clientEmail),
    quote.clientPhone ? fieldRow("Telefono", quote.clientPhone) : "",
    fieldRow("Preferenza di contatto", contactPreferenceLabel(quote.contactPreference)),
    fieldRow("Quantità", String(quote.quantity)),
    quote.material ? fieldRow("Materiale", quote.material) : "",
    quote.color ? fieldRow("Colore", quote.color) : "",
    fieldRow("File 3D allegato", quote.has3dFile ? "Sì" : "No"),
    quote.driveLink ? fieldRow("Link al file", quote.driveLink) : "",
    quote.deadline ? fieldRow("Scadenza indicata", quote.deadline) : "",
    fieldRow("Descrizione", truncate(quote.description)),
    quote.notes ? fieldRow("Note", truncate(quote.notes, 400)) : "",
    primaryButton(dashboardUrl, "Apri nel pannello"),
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderShell({
    kicker: "Nuova richiesta",
    heading: "Nuova richiesta di preventivo",
    bodyHtml,
    footerHtml: `Richiesta #${ref} — Creative Solution. I file 3D non vengono mai allegati alle email: scaricali dal pannello admin con il link sicuro sopra.`,
  });

  const text = [
    `Nuova richiesta di preventivo — ${quote.projectTitle}`,
    "",
    `Titolo progetto: ${quote.projectTitle}`,
    `Cliente: ${quote.clientName}`,
    `Email cliente: ${quote.clientEmail}`,
    quote.clientPhone ? `Telefono: ${quote.clientPhone}` : "",
    `Preferenza di contatto: ${contactPreferenceLabel(quote.contactPreference)}`,
    `Quantità: ${quote.quantity}`,
    quote.material ? `Materiale: ${quote.material}` : "",
    quote.color ? `Colore: ${quote.color}` : "",
    `File 3D allegato: ${quote.has3dFile ? "Sì" : "No"}`,
    quote.driveLink ? `Link al file: ${quote.driveLink}` : "",
    quote.deadline ? `Scadenza indicata: ${quote.deadline}` : "",
    `Descrizione: ${truncate(quote.description)}`,
    quote.notes ? `Note: ${truncate(quote.notes, 400)}` : "",
    "",
    `Apri nel pannello: ${dashboardUrl}`,
    "",
    `Richiesta #${ref} — Creative Solution. I file 3D non vengono mai allegati alle email: scaricali dal pannello admin con il link sicuro sopra.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error("[emails] admin notification failed:", error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true, id: data?.id };
}

/**
 * Confirmation to the client after their quote request is saved.
 * No timeline/price promises — only "we will answer with a personalized
 * quote", plus the reference ID and the official social links.
 */
export async function sendClientQuoteConfirmation(
  quote: QuoteEmailData,
): Promise<EmailSendResult> {
  const resend = getResendClient();
  if (!resend) return { ok: false, reason: "not-configured" };

  const settings = await getEmailSiteSettings();
  const from = process.env.RESEND_FROM_EMAIL ?? "";
  const to = quote.clientEmail.trim();

  const subject = "Abbiamo ricevuto la tua richiesta — Creative Solution";
  const ref = shortReference(quote.quoteRequestId);

  const bodyHtml = [
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.text};">Ciao ${escapeHtml(quote.clientName)},</p>`,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.text};">La tua richiesta di preventivo è arrivata: la stiamo prendendo in carico e ti risponderemo al più presto con un preventivo personalizzato.</p>`,
    `<div style="margin:0 0 20px;padding:14px 16px;background-color:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:bold;color:${BRAND.muted};letter-spacing:0.8px;text-transform:uppercase;">Riferimento richiesta</p>
      <p style="margin:0;font-size:18px;font-weight:bold;color:${BRAND.accent};">#${ref}</p>
    </div>`,
    fieldRow("Titolo progetto", quote.projectTitle),
    fieldRow("Quantità", String(quote.quantity)),
    quote.material ? fieldRow("Materiale", quote.material) : "",
    quote.color ? fieldRow("Colore", quote.color) : "",
    settings.socialInstagram || settings.socialTiktok
      ? `<p style="margin:20px 0 8px;font-size:11px;font-weight:bold;color:${BRAND.muted};letter-spacing:0.8px;text-transform:uppercase;">Nel frattempo, seguici sui social</p>`
      : "",
    settings.socialInstagram
      ? `<p style="margin:0 0 6px;font-size:15px;"><a href="${escapeHtml(settings.socialInstagram)}" style="color:${BRAND.accent};">Instagram — @creativesolution.2024</a></p>`
      : "",
    settings.socialTiktok
      ? `<p style="margin:0;font-size:15px;"><a href="${escapeHtml(settings.socialTiktok)}" style="color:${BRAND.accent};">TikTok — @bergaminisamuele</a></p>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderShell({
    kicker: "Richiesta ricevuta",
    heading: "Abbiamo ricevuto la tua richiesta",
    bodyHtml,
    footerHtml:
      "Ricevi questa email perché hai inviato una richiesta di preventivo dal sito Creative Solution. Se non hai inviato tu questa richiesta, puoi ignorare questa email.",
  });

  const text = [
    `Abbiamo ricevuto la tua richiesta — Creative Solution`,
    "",
    `Ciao ${quote.clientName},`,
    "",
    `La tua richiesta di preventivo è arrivata: la stiamo prendendo in carico e ti risponderemo al più presto con un preventivo personalizzato.`,
    "",
    `Riferimento richiesta: #${ref}`,
    `Titolo progetto: ${quote.projectTitle}`,
    `Quantità: ${quote.quantity}`,
    quote.material ? `Materiale: ${quote.material}` : "",
    quote.color ? `Colore: ${quote.color}` : "",
    settings.socialInstagram ? `Instagram: ${settings.socialInstagram}` : "",
    settings.socialTiktok ? `TikTok: ${settings.socialTiktok}` : "",
    "",
    "Ricevi questa email perché hai inviato una richiesta di preventivo dal sito Creative Solution. Se non hai inviato tu questa richiesta, puoi ignorare questa email.",
  ]
    .filter(Boolean)
    .join("\n");

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error("[emails] client confirmation failed:", error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true, id: data?.id };
}

/**
 * Send both notifications (admin + client) for a saved quote request.
 * Never throws: every send is isolated in try/catch and failures are logged,
 * so an email outage never blocks or fails the quote submission.
 * TODO(M6): durable retry queue (e.g. a table + cron) for failed sends.
 */
export async function sendQuoteEmails(quote: QuoteEmailData): Promise<void> {
  // Admin first: if the DB settings read fails the send functions already
  // fall back to RESEND_FROM_EMAIL, so a misconfigured admin panel never
  // stops the flow. Each email is guarded separately.
  try {
    const adminResult = await sendAdminNewQuoteNotification(quote);
    if (!adminResult.ok) {
      console.error(
        `[emails] admin notification not sent (${adminResult.reason}) for quote ${quote.quoteRequestId}`,
      );
    }
  } catch (error) {
    console.error("[emails] unexpected error in admin notification:", error);
  }

  try {
    const clientResult = await sendClientQuoteConfirmation(quote);
    if (!clientResult.ok) {
      console.error(
        `[emails] client confirmation not sent (${clientResult.reason}) for quote ${quote.quoteRequestId}`,
      );
    }
  } catch (error) {
    console.error("[emails] unexpected error in client confirmation:", error);
  }
}