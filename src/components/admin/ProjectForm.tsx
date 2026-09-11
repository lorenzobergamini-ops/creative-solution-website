"use client";

/**
 * Gallery project form (admin) — create/edit a project: title, auto slug
 * (editable), description, service type, material, sort order, publish flag
 * and image management (multi-upload with alt text + remove).
 *
 * Every mutation is a server action re-verified in src/app/actions/admin.ts
 * (session + role). UI text is Italian. No effects: slug auto-generation
 * happens in the title onChange handler (React Compiler-safe).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createProject,
  removeGalleryImage,
  updateProject,
  uploadGalleryImage,
} from "@/app/actions/admin";
import { SERVICE_TYPE_LABELS } from "@/lib/gallery";
import type { AdminImage, AdminProjectDetail } from "@/lib/admin";
import { AdminAlert, AdminPageHeader, formatFileSize } from "./admin-ui";

const SERVICE_TYPE_VALUES = Object.keys(SERVICE_TYPE_LABELS);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface UploadItem {
  file: File;
  key: string;
}

export function ProjectForm({
  project,
}: {
  project?: AdminProjectDetail | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(project);

  const [title, setTitle] = useState(project?.title ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const [description, setDescription] = useState(project?.description ?? "");
  const [serviceType, setServiceType] = useState(project?.serviceType ?? "");
  const [material, setMaterial] = useState(project?.material ?? "");
  const [sortOrder, setSortOrder] = useState(String(project?.sortOrder ?? 0));
  const [isPublished, setIsPublished] = useState(project?.isPublished ?? false);

  const [files, setFiles] = useState<UploadItem[]>([]);
  const [altText, setAltText] = useState("");
  const [images, setImages] = useState<AdminImage[]>(project?.images ?? []);

  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleAddFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next: UploadItem[] = [];
    for (const file of Array.from(fileList)) {
      next.push({ file, key: `${file.name}-${file.size}-${crypto.randomUUID()}` });
    }
    setFiles((prev) => [...prev, ...next]);
  }

  function handleRemovePending(key: string) {
    setFiles((prev) => prev.filter((item) => item.key !== key));
  }

  async function handleUploadAll() {
    setError(null);
    setSuccess(null);
    if (!project) {
      setError("Salva prima i dati del progetto, poi carica le immagini.");
      return;
    }
    setUploading(true);
    const selectedAlt = altText.trim();
    for (const item of files) {
      const formData = new FormData();
      formData.set("projectId", project.id);
      formData.set("altText", selectedAlt);
      formData.set("file", item.file);
      const result = await uploadGalleryImage(formData);
      if (!result.ok) {
        setError(`${item.file.name}: ${result.error}`);
        break;
      }
    }
    setUploading(false);
    setFiles([]);
    setAltText("");
    router.refresh();
    setSuccess("Immagini caricate.");
  }

  async function handleRemoveImage(imageId: string) {
    setError(null);
    setSuccess(null);
    const result = await removeGalleryImage(imageId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setImages((prev) => prev.filter((image) => image.id !== imageId));
    router.refresh();
  }

  function handleSave() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const input = {
        title,
        slug: slug.trim() || undefined,
        description: description || null,
        serviceType: serviceType || null,
        material: material || null,
        sortOrder: Number(sortOrder) || 0,
        isPublished,
      };
      const result = isEdit
        ? await updateProject(project!.id, input)
        : await createProject(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/galleria");
      router.refresh();
    });
  }

  const inputClass =
    "h-11 w-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-0";
  const labelClass = "text-sm font-medium text-foreground";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/galleria"
          className="mb-4 inline-block text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          ← Torna alla galleria
        </Link>
        <AdminPageHeader
          title={isEdit ? "Modifica progetto" : "Nuovo progetto"}
          description="Titolo, descrizione e dati di servizio. Le immagini si caricano dopo il salvataggio iniziale."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* -------- Basic fields -------- */}
        <div className="flex flex-col gap-5 border border-border bg-surface p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="proj-title" className={labelClass}>
              Titolo
            </label>
            <input
              id="proj-title"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              required
              maxLength={120}
              placeholder="es. Porta spazzolini a forma di drago"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="proj-slug" className={labelClass}>
              Slug (URL)
            </label>
            <input
              id="proj-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="porta-spazzolini-drago"
              className={inputClass}
            />
            <p className="text-xs text-muted">
              Comparirà in /galleria/{slug || "…"}. Si genera dal titolo e può
              essere modificato.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="proj-description" className={labelClass}>
              Descrizione
            </label>
            <textarea
              id="proj-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              placeholder="Racconta il progetto: idea, processo, materiale, dimensioni…"
              className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="proj-service" className={labelClass}>
              Categoria di servizio
            </label>
            <select
              id="proj-service"
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value)}
              className={inputClass}
            >
              <option value="">Nessuna categoria</option>
              {SERVICE_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {SERVICE_TYPE_LABELS[value as keyof typeof SERVICE_TYPE_LABELS]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="proj-material" className={labelClass}>
                Materiale
              </label>
              <input
                id="proj-material"
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
                maxLength={60}
                placeholder="es. PLA"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="proj-order" className={labelClass}>
                Ordinamento
              </label>
              <input
                id="proj-order"
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-muted">Valori più bassi prima.</p>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Pubblicato (visibile nella galleria pubblica)
          </label>

          {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
          {success ? <AdminAlert tone="success">{success}</AdminAlert> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={pending || title.trim().length === 0}
            className="inline-flex h-12 items-center justify-center bg-accent px-6 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground disabled:opacity-60"
          >
            {pending ? "Salvataggio…" : isEdit ? "Salva modifiche" : "Crea progetto"}
          </button>
        </div>

        {/* -------- Images -------- */}
        <div className="flex flex-col gap-5 border border-border bg-surface p-6">
          <h2 className="font-display text-base font-bold text-foreground">
            Immagini
          </h2>

          {images.length > 0 ? (
            <div className="flex flex-col divide-y divide-border border border-border">
              {images.map((image) => (
                <div key={image.id} className="flex items-center gap-4 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbs */}
                  <img
                    src={image.url ?? undefined}
                    alt={image.altText || image.storagePath}
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 border border-border bg-grid object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm text-foreground">
                      {image.altText || "Senza testo alternativo"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      ordine {image.sortOrder}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(image.id)}
                    className="shrink-0 border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-error transition-colors hover:border-error"
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nessuna immagine caricata.</p>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <label htmlFor="proj-alt" className={labelClass}>
              Testo alternativo (per le nuove immagini)
            </label>
            <input
              id="proj-alt"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              maxLength={300}
              placeholder="es. Statuetta stampata in 3D vista frontale"
              className={inputClass}
            />
            <label htmlFor="proj-file" className={labelClass}>
              File immagine (JPG, PNG, WebP o GIF — max 10 MB ciascuna)
            </label>
            <input
              id="proj-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(event) => handleAddFiles(event.target.files)}
              className="block w-full text-sm text-muted file:mr-4 file:border-0 file:bg-surface file:px-4 file:py-2.5 file:font-display file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-accent"
            />
            {files.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {files.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-3 text-sm text-muted"
                  >
                    <span className="truncate">
                      {item.file.name} · {formatFileSize(item.file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePending(item.key)}
                      className="shrink-0 text-xs text-error underline-offset-4 hover:underline"
                    >
                      Rimuovi
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              onClick={handleUploadAll}
              disabled={uploading || files.length === 0 || !project}
              className="inline-flex h-11 items-center justify-center border border-accent px-6 font-display text-sm font-semibold uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-background disabled:opacity-50"
            >
              {uploading ? "Caricamento…" : `Carica ${files.length > 0 ? files.length : ""} immagine${files.length === 1 ? "" : "i"}`}
            </button>
            {!project ? (
              <p className="text-xs text-muted">
                Crea prima il progetto per abilitare l&apos;upload delle immagini.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}