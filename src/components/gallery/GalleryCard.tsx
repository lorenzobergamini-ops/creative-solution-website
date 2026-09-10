"use client";

import { useState } from "react";
import Link from "next/link";
import type { GalleryProject } from "@/lib/gallery";
import { Lightbox } from "./Lightbox";
import { ProjectImage } from "./ProjectImage";

/**
 * Gallery card (client component) used on /galleria and on the home page
 * ("Lavori recenti", `compact` variant).
 *
 * Progressive enhancement: with JS the cover opens the accessible lightbox
 * of the project images; without JS (or for the title, always) the link
 * opens the detail page /galleria/[slug]. The title link is the permanent
 * path to the detail page.
 */
export function GalleryCard({
  project,
  compact = false,
}: {
  project: GalleryProject;
  compact?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const detailHref = `/galleria/${project.slug}`;

  return (
    <article className="group flex flex-col border border-border bg-surface transition-colors hover:border-accent">
      {/* Cover — link to the detail page; with JS the click opens the lightbox. */}
      <a
        href={detailHref}
        onClick={(event) => {
          // Without images there is nothing to browse in the lightbox:
          // follow the link to the detail page.
          if (project.images.length === 0) return;
          event.preventDefault();
          setLightboxOpen(true);
        }}
        aria-label={
          project.images.length > 0
            ? `Apri le immagini di ${project.title}`
            : `Vai al progetto ${project.title}`
        }
        className={`relative block overflow-hidden border-b border-border ${
          compact ? "aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <ProjectImage
          url={project.coverUrl}
          alt={project.coverAlt}
          sizes={
            compact
              ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {project.category ? (
          <span className="absolute left-3 top-3 border border-border bg-background/90 px-2.5 py-1 font-display text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-accent">
            {project.category}
          </span>
        ) : null}
      </a>

      <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-5" : "p-6"}`}>
        <h3 className="font-display font-bold text-foreground">
          <Link
            href={detailHref}
            className="transition-colors hover:text-accent"
          >
            {project.title}
          </Link>
        </h3>
        {project.description ? (
          <p className={`leading-relaxed text-muted ${compact ? "text-sm" : "text-sm"}`}>
            {project.description}
          </p>
        ) : null}
        {project.material ? (
          <p className="mt-auto pt-1 text-xs uppercase tracking-[0.2em] text-muted">
            Materiale:{" "}
            <span className="text-foreground">{project.material}</span>
          </p>
        ) : null}
      </div>

      <Lightbox
        key={project.slug}
        images={project.images}
        title={project.title}
        initialIndex={0}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </article>
  );
}