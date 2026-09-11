"use client";

/**
 * Quote requests list (admin) — client-side search (name / title / email)
 * and status filter chips. Data arrives from the server page; no refetching.
 * UI text is Italian.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_VALUES,
  type QuoteRequestListItem,
  type QuoteStatus,
} from "@/lib/admin";
import { AdminEmptyState, AdminStatusBadge, formatDate } from "./admin-ui";

export function QuoteRequestsTable({
  requests,
  initialStatus,
}: {
  requests: QuoteRequestListItem[];
  initialStatus: QuoteStatus | null;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<QuoteStatus | null>(initialStatus);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (status && request.status !== status) return false;
      if (q.length === 0) return true;
      return (
        request.clientName.toLowerCase().includes(q) ||
        request.projectTitle.toLowerCase().includes(q) ||
        request.clientEmail.toLowerCase().includes(q)
      );
    });
  }, [requests, query, status]);

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="flex flex-col gap-2">
        <label htmlFor="ricerca-richieste" className="text-sm font-medium text-foreground">
          Cerca per nome, titolo o email
        </label>
        <input
          id="ricerca-richieste"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="es. Mario Rossi, stampa ingranaggio…"
          className="h-12 w-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
        />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtra per stato">
        <button
          type="button"
          onClick={() => setStatus(null)}
          aria-pressed={status === null}
          className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
            status === null
              ? "border-accent bg-accent text-background"
              : "border-border text-muted hover:border-accent hover:text-accent"
          }`}
        >
          Tutte
        </button>
        {QUOTE_STATUS_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
            className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
              status === value
                ? "border-accent bg-accent text-background"
                : "border-border text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {QUOTE_STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted" role="status">
        {filtered.length} {filtered.length === 1 ? "richiesta" : "richieste"}
        {status ? ` · filtro: ${QUOTE_STATUS_LABELS[status]}` : ""}
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <AdminEmptyState
          title="Nessuna richiesta trovata"
          description={
            requests.length === 0
              ? "Quando i visitatori invieranno il form di preventivo, le richieste compariranno qui."
              : "Prova a modificare la ricerca o il filtro per stato."
          }
        />
      ) : (
        <div className="overflow-x-auto border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.15em] text-muted">
                <th scope="col" className="px-5 py-3 font-medium">Nome</th>
                <th scope="col" className="px-5 py-3 font-medium">Titolo progetto</th>
                <th scope="col" className="px-5 py-3 font-medium">Email</th>
                <th scope="col" className="px-5 py-3 font-medium">Stato</th>
                <th scope="col" className="px-5 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((request) => (
                <tr key={request.id} className="transition-colors hover:bg-background">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/richieste/${request.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
                    >
                      {request.clientName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted">{request.projectTitle}</td>
                  <td className="px-5 py-4 text-muted">{request.clientEmail}</td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge status={request.status} />
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {formatDate(request.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}