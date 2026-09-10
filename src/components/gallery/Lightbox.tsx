"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryImage } from "@/lib/gallery";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import { ProjectImage } from "./ProjectImage";

/**
 * Accessible lightbox (client component).
 *
 * Uses the native <dialog> element with showModal(): the browser provides
 * role="dialog", Escape-to-close and the base focus trap out of the box.
 * On top of that:
 *  - ArrowLeft / ArrowRight navigate between the project images (wrap-around);
 *  - a visible close button receives initial focus;
 *  - the page scroll is locked while the dialog is open;
 *  - the whole dialog has an aria-label with the project title.
 *
 * Callers render it with `open` state, e.g.:
 *   <Lightbox key={project.slug} images={project.images} title={project.title}
 *             open={lightboxOpen} initialIndex={0} onClose={() => setLightboxOpen(false)} />
 * Pass `key` to reset the internal index when opening a different project.
 */
export function Lightbox({
  images,
  title,
  open,
  initialIndex = 0,
  onClose,
}: {
  images: GalleryImage[];
  title: string;
  open: boolean;
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const imageCount = images.length;

  // Reset the position when the dialog (re)opens. React-documented pattern:
  // adjust state during render instead of in an effect (no cascading renders).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setIndex(initialIndex);
    }
  }

  // Open/close the native dialog and lock the page scroll while open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) {
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const goPrevious = useCallback(() => {
    setIndex((current) => (current - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % imageCount);
  }, [imageCount]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
    // Escape is handled natively by <dialog> (cancel event -> onClose).
  };

  if (imageCount === 0) return null;

  const current = images[index];
  const currentAlt = current.altText || `${title} — immagine ${index + 1}`;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-label={`${title} — galleria immagini`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={handleDialogKeyDown}
      className="backdrop:bg-black/80 m-auto flex max-h-[90vh] w-[min(92vw,64rem)] flex-col border border-border bg-surface text-foreground shadow-2xl"
    >
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <span className="min-w-0 truncate font-display text-sm font-bold uppercase tracking-[0.15em]">
          {title}
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Chiudi la galleria"
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-border text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-background md:aspect-[16/10]">
        <ProjectImage
          key={current.url ?? `placeholder-${index}`}
          url={current.url}
          alt={currentAlt}
          sizes="(max-width: 1024px) 100vw, 64rem"
          priority
        />
      </div>

      <footer className="flex items-center justify-between gap-4 px-5 py-4">
        <button
          type="button"
          onClick={goPrevious}
          disabled={imageCount < 2}
          aria-label="Immagine precedente"
          className="flex items-center gap-2 border border-border px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Precedente
        </button>
        <p className="font-display text-xs font-semibold tracking-[0.3em] text-muted" aria-live="polite">
          {index + 1} / {imageCount}
        </p>
        <button
          type="button"
          onClick={goNext}
          disabled={imageCount < 2}
          aria-label="Immagine successiva"
          className="flex items-center gap-2 border border-border px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Successiva
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </footer>
    </dialog>
  );
}