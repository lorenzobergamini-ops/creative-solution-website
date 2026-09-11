import Link from "next/link";
import { fetchAdminProjectsList } from "@/lib/admin";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminTag,
} from "@/components/admin/admin-ui";
import { ProjectActions } from "@/components/admin/ProjectActions";

/**
 * /admin/galleria — list of ALL projects (published and hidden) with cover
 * thumbnail, title, status badge and actions (edit / publish-hide / delete).
 */
export default async function AdminGalleriaPage() {
  const result = await fetchAdminProjectsList();

  if (result.status !== "ok") {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Galleria" />
        <AdminEmptyState
          title="Configurazione non disponibile"
          description="L'elenco dei progetti non è disponibile: completa la configurazione Supabase per visualizzarlo."
        />
      </div>
    );
  }

  const projects = result.data;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Galleria"
        description="Gestisci i progetti mostrati nella galleria pubblica. I progetti nascosti non sono visibili ai visitatori."
        actions={
          <Link
            href="/admin/galleria/nuovo"
            className="inline-flex h-11 items-center justify-center bg-accent px-6 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground"
          >
            Nuovo progetto
          </Link>
        }
      />

      {projects.length === 0 ? (
        <AdminEmptyState
          title="Nessun progetto"
          description="Crea il primo progetto della galleria con il pulsante “Nuovo progetto”."
        />
      ) : (
        <div className="flex flex-col divide-y divide-border border border-border bg-surface">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center"
            >
              {/* Cover */}
              <div className="h-20 w-full shrink-0 overflow-hidden border border-border bg-grid sm:h-16 sm:w-24">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails: plain <img> keeps it simple and avoids remote-pattern config for storage */}
                <img
                  src={project.coverUrl ?? undefined}
                  alt={project.coverAlt}
                  width={96}
                  height={64}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/galleria/${project.id}`}
                    className="font-display text-base font-bold text-foreground underline-offset-4 hover:text-accent hover:underline"
                  >
                    {project.title}
                  </Link>
                  {project.isPublished ? (
                    <AdminTag className="border-status-success/60 text-status-success">
                      Pubblicato
                    </AdminTag>
                  ) : (
                    <AdminTag className="border-status-warn/60 text-status-warn">
                      Nascosto
                    </AdminTag>
                  )}
                </div>
                <p className="truncate text-sm text-muted">
                  /galleria/{project.slug}
                  {project.serviceType ? ` · ${project.serviceType.replace(/_/g, " ")}` : ""}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:items-end">
                <Link
                  href={`/admin/galleria/${project.id}`}
                  className="inline-flex h-9 items-center border border-border px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  Modifica
                </Link>
                <ProjectActions
                  projectId={project.id}
                  isPublished={project.isPublished}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}