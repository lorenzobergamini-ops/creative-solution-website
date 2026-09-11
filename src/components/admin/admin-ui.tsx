import type { ReactNode } from "react";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONE,
  type QuoteStatus,
} from "@/lib/admin";

/**
 * Shared UI primitives for the admin panel (milestone M5).
 * Server-safe (no hooks). All UI text is Italian; styling follows the design
 * system tokens (--background, --surface, --border, --foreground, --muted,
 * --accent, --error, --status-*) with sharp corners and no gradients.
 */

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-2xl flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          Pannello di amministrazione
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`border border-border bg-surface ${className}`}>{children}</div>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="bg-grid flex flex-col items-center gap-4 border border-dashed border-border px-6 py-16 text-center">
      {icon ?? null}
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}

const BADGE_TONE_CLASSES: Record<
  "accent" | "info" | "success" | "warn" | "danger" | "muted",
  string
> = {
  accent: "border-accent/60 text-accent",
  info: "border-status-info/60 text-status-info",
  success: "border-status-success/60 text-status-success",
  warn: "border-status-warn/60 text-status-warn",
  danger: "border-error/60 text-error",
  muted: "border-border text-muted",
};

export function AdminStatusBadge({ status }: { status: QuoteStatus }) {
  const tone = QUOTE_STATUS_TONE[status];
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${BADGE_TONE_CLASSES[tone]}`}
    >
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}

export function AdminTag({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center border border-border px-2.5 py-1 text-xs font-medium text-muted ${className}`}
    >
      {children}
    </span>
  );
}

export function AdminAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const toneClasses =
    tone === "error"
      ? "border-error/60 text-error"
      : tone === "success"
        ? "border-status-success/60 text-status-success"
        : "border-status-info/60 text-status-info";
  return (
    <p role="status" className={`border px-4 py-3 text-sm ${toneClasses}`}>
      {children}
    </p>
  );
}

// ------------------------------------------------------------------
// Formatting helpers (pure, usable server & client)
// ------------------------------------------------------------------

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}