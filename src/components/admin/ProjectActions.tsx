"use client";

/**
 * Gallery list actions (admin): publish/hide toggle and delete with a
 * two-step inline confirm (no native confirm dialog). UI text is Italian.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProject, setProjectPublished } from "@/app/actions/admin";
import { AdminAlert } from "./admin-ui";

export function ProjectActions({
  projectId,
  isPublished,
}: {
  projectId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePublish() {
    setError(null);
    startTransition(async () => {
      const result = await setProjectPublished(projectId, !isPublished);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={togglePublish}
          className={`inline-flex h-9 items-center border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-60 ${
            isPublished
              ? "border-border text-muted hover:border-accent hover:text-accent"
              : "border-accent text-accent hover:bg-accent hover:text-background"
          }`}
        >
          {isPublished ? "Nascondi" : "Pubblica"}
        </button>
        {confirmDelete ? (
          <span className="inline-flex h-9 items-center gap-2">
            <span className="text-xs text-error">Confermi?</span>
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="inline-flex h-9 items-center border border-error px-3 text-xs font-semibold uppercase tracking-[0.12em] text-error transition-colors hover:bg-error hover:text-background disabled:opacity-60"
            >
              {pending ? "…" : "Elimina"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmDelete(false)}
              className="inline-flex h-9 items-center border border-border px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground"
            >
              Annulla
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-9 items-center border border-border px-3 text-xs font-semibold uppercase tracking-[0.12em] text-error transition-colors hover:border-error disabled:opacity-60"
          >
            Elimina
          </button>
        )}
      </div>
      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
    </div>
  );
}