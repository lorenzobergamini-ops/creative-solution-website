import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared layout primitives for the public pages.
 * All UI text is Italian; styling follows the design system tokens
 * (--background, --surface, --border, --accent, font-display).
 */

export function Container({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 md:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  const alignment =
    align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <header className={`flex max-w-2xl flex-col gap-3 ${alignment}`}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="text-base leading-relaxed text-muted">{description}</p>
      ) : null}
    </header>
  );
}

type ButtonVariant = "primary" | "secondary";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-background hover:bg-foreground hover:text-background",
  secondary:
    "border border-border text-foreground hover:border-accent hover:text-accent",
};

/**
 * Call-to-action link styled as a button. Sharp corners, uppercase display
 * type — technical/brand look. No invented content: hrefs are app routes.
 */
export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] transition-colors ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * Honest placeholder for missing media (photos, gallery items).
 * Shows a subtle technical grid + a label, so it's obvious the real image
 * has not been provided yet and must be replaced — never fake content.
 */
export function MediaPlaceholder({
  label = "Immagine in attesa",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`bg-grid flex items-center justify-center border border-dashed border-border text-center ${className}`}
    >
      <span className="px-4 text-xs font-medium uppercase tracking-[0.25em] text-muted">
        {label}
      </span>
    </div>
  );
}