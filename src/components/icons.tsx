/**
 * Inline SVG icons — simple, stroke-based, inherit currentColor.
 * No icon library on purpose (bundle size + brand control). Keep them small
 * and consistent: strokeWidth 1.8, viewBox 24x24.
 */

interface IconProps {
  className?: string;
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.6 3c.35 1.9 1.5 3.3 3.4 3.6v3.1c-1.25 0-2.4-.35-3.4-1v6a6.15 6.15 0 1 1-6.15-6.15c.32 0 .63.03.94.08v3.15a3 3 0 1 0 2.05 2.84V3h3.16z" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 12h15" />
      <path d="M13 6.5 18.5 12 13 17.5" />
    </svg>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15.5 5.5 8.5 12l7 6.5" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m8.5 5.5 7 6.5-7 6.5" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 0 0-7.78 13.53L3 21l4.63-1.17A9 9 0 1 0 12 3Zm0 1.7a7.3 7.3 0 1 1-3.7 13.6l-.27-.16-2.74.7.72-2.67-.18-.28A7.3 7.3 0 0 1 12 4.7Zm-3.2 3.6c-.18 0-.47.07-.72.34-.25.28-.94.92-.94 2.24 0 1.32.96 2.6 1.1 2.78.13.18 1.87 2.98 4.6 4.06 2.26.9 2.73.72 3.22.67.5-.04 1.6-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.31-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07a6.9 6.9 0 0 1-2.29-1.41 8.3 8.3 0 0 1-1.58-1.97c-.17-.28-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.17.19-.29.28-.48.1-.2.05-.36-.02-.5-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47l-.53-.03Z" />
    </svg>
  );
}

/**
 * Brand placeholder mark: an isometric cube outline (3D printing, layers).
 * NOT the final logo — just a placeholder until the owner provides artwork.
 */
export function CubeMark({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.8 20.5 7.5v9L12 21.2 3.5 16.5v-9L12 2.8Z" />
      <path d="M3.5 7.5 12 12.2l8.5-4.7" />
      <path d="M12 12.2v9" />
    </svg>
  );
}