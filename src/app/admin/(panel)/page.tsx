import Link from "next/link";
import { fetchDashboardData, QUOTE_STATUS_VALUES, QUOTE_STATUS_LABELS } from "@/lib/admin";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/admin-ui";

/**
 * /admin — dashboard: totals per status + the 5 most recent requests.
 * All data is read server-side with the service role; without credentials the
 * page shows the honest "configurazione non disponibile" empty state.
 */
export default async function AdminDashboardPage() {
  const result = await fetchDashboardData();

  if (result.status !== "ok") {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Dashboard" />
        <AdminEmptyState
          title="Configurazione non disponibile"
          description="Le statistiche delle richieste non sono disponibili: completa la configurazione Supabase per visualizzarle."
        />
      </div>
    );
  }

  const { total, countsByStatus, latest } = result.data;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Dashboard"
        description="Panoramica delle richieste di preventivo ricevute dal form."
      />

      {/* Status counts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {QUOTE_STATUS_VALUES.map((status) => {
          const count = countsByStatus[status] ?? 0;
          return (
            <Link
              key={status}
              href={`/admin/richieste?stato=${status}`}
              className="flex flex-col gap-1 border border-border bg-surface p-5 transition-colors hover:border-accent"
            >
              <span className="text-3xl font-bold font-display text-foreground">
                {count}
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-muted">
                {QUOTE_STATUS_LABELS[status]}
              </span>
            </Link>
          );
        })}
      </div>

      <AdminCard className="flex items-center justify-between gap-4 p-5">
        <p className="text-sm text-muted">
          Totale richieste ricevute
        </p>
        <p className="font-display text-2xl font-bold text-accent">{total}</p>
      </AdminCard>

      {/* Latest requests */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            Ultime richieste
          </h2>
          <Link
            href="/admin/richieste"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Vedi tutte
          </Link>
        </div>
        {latest.length === 0 ? (
          <AdminEmptyState
            title="Nessuna richiesta"
            description="Quando i visitatori invieranno il form di preventivo, le richieste compariranno qui."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border border border-border bg-surface">
            {latest.map((request) => (
              <Link
                key={request.id}
                href={`/admin/richieste/${request.id}`}
                className="flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-background"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {request.clientName}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(request.createdAt).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted">{request.projectTitle}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}