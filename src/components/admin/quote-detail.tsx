"use client";

/**
 * Quote request detail widgets (admin): status select, admin notes editor and
 * the signed-URL download button. Every action is re-verified server-side in
 * src/app/actions/admin.ts. UI text is Italian.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_VALUES,
  type QuoteStatus,
} from "@/lib/admin";
import {
  getQuoteFileSignedUrl,
  updateAdminNotes,
  updateQuoteStatus,
} from "@/app/actions/admin";
import { AdminAlert, formatFileSize } from "./admin-ui";

// ------------------------------------------------------------------
// Status select
// ------------------------------------------------------------------

export function StatusSelectForm({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: QuoteStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<QuoteStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  function handleChange(next: QuoteStatus) {
    setStatus(next);
    setMessage(null);
    startTransition(async () => {
      const result = await updateQuoteStatus(requestId, next);
      if (!result.ok) {
        setStatus(currentStatus);
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "Stato aggiornato." });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`stato-${requestId}`} className="text-sm font-medium text-foreground">
        Stato richiesta
      </label>
      <select
        id={`stato-${requestId}`}
        value={status}
        disabled={pending}
        onChange={(event) => handleChange(event.target.value as QuoteStatus)}
        className="h-11 w-full max-w-xs border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-0 disabled:opacity-60"
      >
        {QUOTE_STATUS_VALUES.map((value) => (
          <option key={value} value={value}>
            {QUOTE_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      {message ? <AdminAlert tone={message.tone}>{message.text}</AdminAlert> : null}
    </div>
  );
}

// ------------------------------------------------------------------
// Admin notes editor
// ------------------------------------------------------------------

export function AdminNotesForm({
  requestId,
  initialNotes,
}: {
  requestId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateAdminNotes(requestId, notes);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "Note salvate." });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`note-${requestId}`} className="text-sm font-medium text-foreground">
        Note interne
      </label>
      <textarea
        id={`note-${requestId}`}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={5}
        placeholder="Appunti riservati solo all'admin (non visibili al cliente)…"
        className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex h-10 items-center justify-center bg-accent px-5 font-display text-xs font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground disabled:opacity-60"
        >
          {pending ? "Salvataggio…" : "Salva note"}
        </button>
        {message ? <AdminAlert tone={message.tone}>{message.text}</AdminAlert> : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Quote file row + signed download
// ------------------------------------------------------------------

import type { QuoteFileRow } from "@/lib/admin";
import { QUOTE_FILE_STATUS_LABELS } from "@/lib/admin";

function FileTypeLabel({ fileType }: { fileType: "model" | "reference" }) {
  return fileType === "model" ? "File 3D" : "Riferimento";
}

export function QuoteFilesTable({ files }: { files: QuoteFileRow[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(fileId: string) {
    setError(null);
    setDownloadingId(fileId);
    try {
      const result = await getQuoteFileSignedUrl(fileId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Navigate to the private signed URL: the browser downloads the object
      // (the bucket 'quote-files' has no public policy — only this action
      // can mint 5-minute URLs).
      window.location.assign(result.data.url);
    } catch {
      setError("Download non riuscito. Riprova.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {files.length === 0 ? (
        <p className="text-sm text-muted">Nessun file allegato a questa richiesta.</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.15em] text-muted">
                <th scope="col" className="px-4 py-3 font-medium">Tipo</th>
                <th scope="col" className="px-4 py-3 font-medium">Nome originale</th>
                <th scope="col" className="px-4 py-3 font-medium">Dimensione</th>
                <th scope="col" className="px-4 py-3 font-medium">Stato</th>
                <th scope="col" className="px-4 py-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {files.map((file) => {
                const uploaded = file.status === "uploaded";
                return (
                  <tr key={file.id}>
                    <td className="px-4 py-3 text-muted">
                      <FileTypeLabel fileType={file.fileType} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {file.originalName}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatFileSize(file.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {QUOTE_FILE_STATUS_LABELS[file.status]}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!uploaded || downloadingId === file.id}
                        onClick={() => handleDownload(file.id)}
                        className="inline-flex h-9 items-center border border-accent px-4 text-xs font-semibold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {downloadingId === file.id ? "Preparazione…" : "Download"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
    </div>
  );
}