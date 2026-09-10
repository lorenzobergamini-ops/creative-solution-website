"use client";

import { useState } from "react";
import Image from "next/image";
import { MediaPlaceholder } from "@/components/ui";

/**
 * next/image wrapper for gallery storage pictures (client component).
 *
 * Falls back to the honest "Immagine in attesa" placeholder when:
 *  - no URL is available (Supabase not configured / project without images);
 *  - the remote object fails to load (e.g. demo seed paths that don't exist).
 *
 * Expects a positioned parent (relative) — the image fills it entirely.
 */
export function ProjectImage({
  url,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  url: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <MediaPlaceholder
        label="Immagine in attesa"
        className="absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}