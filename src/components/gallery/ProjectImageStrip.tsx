"use client";

import { useState } from "react";
import type { GalleryProject } from "@/lib/gallery";
import { Lightbox } from "./Lightbox";
import { ProjectImage } from "./ProjectImage";

/**
 * Image strip of a project detail page (client component).
 * Each thumbnail opens the accessible lightbox at that image; arrows and
 * Escape work inside the dialog. Without JS the rest of the detail page
 * (hero, description, CTA) remains fully server-rendered.
 */
export function ProjectImageStrip({ project }: { project: GalleryProject }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (project.images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {project.images.map((image, index) => (
          <button
            key={image.url ?? `placeholder-${index}`}
            type="button"
            onClick={() => {
              setStartIndex(index);
              setLightboxOpen(true);
            }}
            aria-label={`Apri l'immagine ${index + 1} di ${project.title}`}
            className="relative aspect-[4/3] overflow-hidden border border-border transition-colors hover:border-accent"
          >
            <ProjectImage
              url={image.url}
              alt={image.altText || `${project.title} — immagine ${index + 1}`}
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          </button>
        ))}
      </div>

      <Lightbox
        key={`${project.slug}-${startIndex}`}
        images={project.images}
        title={project.title}
        initialIndex={startIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}