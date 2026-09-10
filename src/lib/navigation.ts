/**
 * Main navigation links, shared by Header and Footer.
 * UI text is Italian; hrefs target the app routes.
 */

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/servizi", label: "Servizi" },
  { href: "/galleria", label: "Galleria" },
  { href: "/come-funziona", label: "Come funziona" },
  { href: "/contatti", label: "Contatti" },
];

/** CTA shown in the header (points to the quote form, Phase M3). */
export const QUOTE_CTA = { href: "/preventivo", label: "Preventivo" } as const;