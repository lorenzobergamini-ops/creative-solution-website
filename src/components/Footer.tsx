import Link from "next/link";
import { NAV_LINKS, QUOTE_CTA } from "@/lib/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { CubeMark, InstagramIcon, TikTokIcon } from "@/components/icons";

/**
 * Site footer: brand column, quick links, official social links and the
 * standard disclaimer. Server component — no state.
 */
export default async function Footer() {
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.6fr_1fr_1fr] md:px-8">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-border text-accent">
              <CubeMark className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Creative<span className="text-accent">Solution</span>
            </span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Stampa 3D su richiesta, pezzi personalizzati, prototipi e
            progettazione. Di Samuele Bergamini.
          </p>
        </div>

        {/* Quick links */}
        <nav aria-label="Link rapidi">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Link rapidi
          </p>
          <ul className="flex flex-col gap-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={QUOTE_CTA.href}
                className="text-sm text-muted transition-colors hover:text-accent"
              >
                Richiedi un preventivo
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="text-sm text-muted transition-colors hover:text-accent"
              >
                Privacy
              </Link>
            </li>
          </ul>
        </nav>

        {/* Social */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Social
          </p>
          <ul className="flex flex-col gap-2.5">
            <li>
              <a
                href={settings.socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 text-sm text-muted transition-colors hover:text-accent"
              >
                <span className="flex h-8 w-8 items-center justify-center border border-border text-muted transition-colors group-hover:border-accent group-hover:text-accent">
                  <InstagramIcon className="h-4 w-4" />
                </span>
                Instagram — @creativesolution.2024
              </a>
            </li>
            <li>
              <a
                href={settings.socialTiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 text-sm text-muted transition-colors hover:text-accent"
              >
                <span className="flex h-8 w-8 items-center justify-center border border-border text-muted transition-colors group-hover:border-accent group-hover:text-accent">
                  <TikTokIcon className="h-4 w-4" />
                </span>
                TikTok — @bergaminisamuele
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            © {year} Creative Solution — Samuele Bergamini. Sito in costruzione.
          </p>
          <p>Sito in fase di sviluppo: contenuti in corso di pubblicazione.</p>
        </div>
      </div>
    </footer>
  );
}