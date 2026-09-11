import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { AdminEmptyState } from "@/components/admin/admin-ui";
import { getAdminSession } from "@/lib/supabase/admin-session";

/**
 * Admin panel routes must NEVER be statically cached: the auth gate
 * (cookies+session) runs on every request, in every environment, regardless
 * of whether the build had env vars or not.
 */
export const dynamic = "force-dynamic";

/**
 * Admin panel layout (milestone M5) — authoritative auth gate + shell.
 *
 * Security: the middleware redirects unauthenticated visitors to /admin/login,
 * but this layout is the SERVER-SIDE gate that no request can bypass: it
 * re-verifies the session and the profiles.role='admin' row via
 * getAdminSession() before rendering any panel page, and every server action
 * re-verifies again. All panel routes live under this layout (route group
 * "(panel)" — URLs are unchanged: /admin, /admin/richieste, ...), while
 * /admin/login is intentionally outside it so the login form has no sidebar.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { configured, userId, isAdmin } = await getAdminSession();

  if (!configured) {
    return (
      <div className="px-5 py-10 md:px-8 md:py-14">
        <AdminEmptyState
          title="Configurazione non disponibile"
          description="Il pannello di amministrazione non è attivo perché le credenziali Supabase non sono configurate. Completa la configurazione (variabili d'ambiente e migrazioni) per accedere."
        />
      </div>
    );
  }

  if (!userId) {
    // Defense in depth: middleware already redirects; render a safe state
    // instead of any panel content (never trust the client).
    redirect("/admin/login");
  }

  if (!isAdmin) {
    return (
      <div className="px-5 py-10 md:px-8 md:py-14">
        <AdminEmptyState
          title="Accesso non consentito"
          description="L'account con cui hai effettuato l'accesso non ha i permessi di amministratore. Contatta il proprietario del sito per verificare la configurazione dei profili."
        />
      </div>
    );
  }

  return <AdminShell title="Pannello di amministrazione">{children}</AdminShell>;
}