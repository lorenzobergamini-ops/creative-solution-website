import { MediaPlaceholder } from "@/components/ui";

/**
 * Honest empty state for the gallery — shown when no published projects
 * exist yet (or Supabase is not configured). Never fake content here.
 */
export function GalleryEmptyState({
  title = "Nessun progetto pubblicato ancora.",
}: {
  title?: string;
}) {
  return (
    <div className="bg-grid border border-dashed border-border">
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <MediaPlaceholder className="h-40 w-40" label="Nessuna immagine" />
        <p className="max-w-md text-sm leading-relaxed text-muted">
          <span className="font-semibold text-foreground">{title}</span>{" "}
          I lavori arriveranno presto — segui i profili social per non perderti
          le novità.
        </p>
      </div>
    </div>
  );
}