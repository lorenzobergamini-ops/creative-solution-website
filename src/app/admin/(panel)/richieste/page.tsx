import {
  QUOTE_STATUS_VALUES,
  fetchQuoteRequests,
  type QuoteRequestListItem,
  type QuoteStatus,
} from "@/lib/admin";
import {
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/admin-ui";
import { QuoteRequestsTable } from "@/components/admin/QuoteRequestsTable";

/**
 * /admin/richieste — all quote requests with client-side text search and
 * status filter chips. The data is fetched server-side (service role); the
 * table component filters locally for instant UX.
 */
export default async function AdminRichiestePage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  const { stato } = await searchParams;
  const initialStatus = QUOTE_STATUS_VALUES.includes(stato as QuoteStatus)
    ? (stato as QuoteStatus)
    : null;

  const result = await fetchQuoteRequests();

  if (result.status === "unavailable") {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Richieste" />
        <AdminEmptyState
          title="Configurazione non disponibile"
          description="L'elenco delle richieste non è disponibile: completa la configurazione Supabase per visualizzarlo."
        />
      </div>
    );
  }

  const requests: QuoteRequestListItem[] = result.status === "ok" ? result.data : [];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Richieste"
        description="Tutte le richieste di preventivo ricevute dal form, con ricerca e filtro per stato."
      />
      <QuoteRequestsTable
        requests={requests}
        initialStatus={initialStatus}
      />
    </div>
  );
}