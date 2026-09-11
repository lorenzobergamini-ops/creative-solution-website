"use client";

/**
 * Admin panel shell (milestone M5) — responsive navigation + logout.
 *
 * Desktop: fixed left sidebar with the section links, a "back to site" link
 * and logout. Mobile: top bar with the brand and logout, plus a bottom
 * navigation bar (always visible, thumb-friendly). The active route is
 * highlighted via usePathname. UI text is Italian.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { getSupabaseAdminBrowserClient } from "@/lib/supabase/admin-client";
import {
  CloseIcon,
  CubeMark,
  MenuIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/richieste", label: "Richieste" },
  { href: "/admin/galleria", label: "Galleria" },
  { href: "/admin/impostazioni", label: "Impostazioni" },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname.startsWith(href);
}

export default function AdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const pathname = usePathname();

  function handleSignOut() {
    startSignOut(async () => {
      const supabase = getSupabaseAdminBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.push("/admin/login");
      router.refresh();
    });
  }

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Navigazione amministrazione">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
              active
                ? "border-l-2 border-accent bg-surface text-accent"
                : "border-l-2 border-transparent text-muted hover:text-foreground"
            }`}
          >
            {item.label}
            <ArrowRightIcon className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center border border-border text-accent">
            <CubeMark className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold text-foreground">
              Creative Solution
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted">
              Admin
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between px-3 py-4">
          {nav}
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Link
              href="/"
              className="flex items-center justify-between px-4 py-2.5 text-sm text-muted transition-colors hover:text-accent"
            >
              Vai al sito
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="px-4 py-2.5 text-left text-sm text-error transition-colors hover:bg-surface disabled:opacity-60"
            >
              {isSigningOut ? "Uscita…" : "Esci"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3 md:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center border border-border text-accent">
              <CubeMark className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-bold text-foreground">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="px-3 py-2 text-sm text-error disabled:opacity-60"
            >
              {isSigningOut ? "…" : "Esci"}
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground"
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-mobile-menu"
              aria-label={mobileMenuOpen ? "Chiudi menu" : "Apri menu"}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? (
                <CloseIcon className="h-5 w-5" />
              ) : (
                <MenuIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {mobileMenuOpen ? (
          <div id="admin-mobile-menu" className="border-b border-border md:hidden">
            <div className="px-3 py-3">{nav}</div>
          </div>
        ) : null}

        {/* Page content */}
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <h1 className="sr-only">{title}</h1>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden"
        aria-label="Navigazione amministrazione mobile"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 px-1 py-3 text-[11px] font-medium ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {/* Spacer so the fixed bottom nav never covers content */}
      <div className="h-14 md:hidden" aria-hidden="true" />
    </div>
  );
}