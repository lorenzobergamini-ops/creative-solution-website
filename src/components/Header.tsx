"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS, QUOTE_CTA } from "@/lib/navigation";
import { CloseIcon, CubeMark, MenuIcon } from "@/components/icons";

/**
 * Sticky site header: brand placeholder mark, desktop nav, accent CTA and
 * a mobile hamburger menu. Client component only for the menu state and the
 * active-route highlight.
 */
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        {/* Brand placeholder — real logo artwork pending from the owner */}
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Creative Solution — Home"
        >
          <span className="flex h-9 w-9 items-center justify-center border border-border text-accent">
            <CubeMark className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Creative<span className="text-accent">Solution</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigazione principale">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={QUOTE_CTA.href}
            className="hidden bg-accent px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground md:inline-flex"
          >
            {QUOTE_CTA.label}
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground transition-colors hover:border-accent hover:text-accent md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen ? (
        <nav
          id="mobile-menu"
          className="border-t border-border bg-surface md:hidden"
          aria-label="Navigazione mobile"
        >
          <div className="flex flex-col gap-1 px-5 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-3 text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-accent"
                    : "text-foreground hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={QUOTE_CTA.href}
              onClick={() => setMenuOpen(false)}
              className="mt-3 inline-flex items-center justify-center bg-accent px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background"
            >
              {QUOTE_CTA.label}
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}