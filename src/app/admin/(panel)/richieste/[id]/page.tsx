import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchQuoteRequestDetail } from "@/lib/admin";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTag,
  formatDate,
} from "@/components/admin/admin-ui";
import {
  AdminNotesForm,
  QuoteFilesTable,
  StatusSelectForm,
} from "@/components/admin/quote-detail";

export const metadata: Metadata = {
  title: "Dettaglio richiesta",
};

const CONTACT_PREFERENCE_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefono",
  whatsapp: "WhatsApp",
};

/**
 * /admin/richieste/[id] — full quote request detail: status select, internal
 * admin notes, uploaded files with signed download. Data is fetched
 * server-side with the service role; the auth gate lives in the panel layout
 * and every mutation action re-verifies session + role.
 */
export default async function AdminRichiesteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchQuoteRequestDetail(id);

  if (result.status === "unavailable") {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Dettaglio richiesta" />
        <AdminEmptyState
          title="Configurazione non disponibile"
          description="Il dettaglio della richiesta non è disponibile: completa la configurazione Supabase per visualizzarlo."
        />
      </div>
    );
  }
  if (result.status === "missing") {
    notFound();
  }

  const request = result.data;

  const infoRows: { label: string; value: string }[] = [
    { label: "Email", value: request.clientEmail },
    ...(request.clientPhone
      ? [{ label: "Telefono", value: request.clientPhone }]
      : []),
    {
      label: "Preferenza contatto",
      value: CONTACT_PREFERENCE_LABELS[request.contactPreference] ?? request.contactPreference,
    },
    { label: "Ricevuta il", value: formatDate(request.createdAt) },
    { label: "Ultimo aggiornamento", value: formatDate(request.updatedAt) },
    { label: "Quantità", value: String(request.quantity) },
    ...(request.material ? [{ label: "Materiale", value: request.material }] : []),
    ...(request.color ? [{ label: "Colore", value: request.color }] : []),
    ...(request.deadline ? [{ label: "Scadenza desiderata", value: request.deadline }] : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/richieste"
          className="mb-4 inline-block text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          ← Torna alle richieste
        </Link>
        <AdminPageHeader
          title={request.projectTitle}
          description={`Richiesta di ${request.clientName}`}
          actions={<AdminStatusBadge status={request.status} />}
        />
      </div>

      {/* Status + notes */}
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard className="flex flex-col gap-4 p-6">
          <StatusSelectForm
            requestId={request.id}
            currentStatus={request.status}
          />
        </AdminCard>
        <AdminCard className="flex flex-col gap-4 p-6">
          <AdminNotesForm
            requestId={request.id}
            initialNotes={request.adminNotes}
          />
        </AdminCard>
      </div>

      {/* Contact / project info */}
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard className="p-6">
          <h2 className="mb-4 font-display text-base font-bold text-foreground">
            Dati di contatto e progetto
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {infoRows.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5">
                <dt className="text-xs uppercase tracking-[0.15em] text-muted">
                  {row.label}
                </dt>
                <dd className="break-words text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </AdminCard>

        <AdminCard className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-base font-bold text-foreground">
              Descrizione del progetto
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
              {request.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {request.has3dFile ? <AdminTag>File 3D allegato</AdminTag> : <AdminTag>Senza file 3D</AdminTag>}
            {request.driveLink ? (
              <AdminTag>Link esterno: {request.driveLink}</AdminTag>
            ) : null}
            {request.rightsConfirmed ? (
              <AdminTag className="border-status-success/60 text-status-success">
                Diritti sul file confermati
              </AdminTag>
            ) : (
              <AdminTag className="border-status-warn/60 text-status-warn">
                Diritti sul file da verificare
              </AdminTag>
            )}
            {request.privacyAccepted ? (
              <AdminTag className="border-status-success/60 text-status-success">
                Privacy accettata
              </AdminTag>
            ) : (
              <AdminTag className="border-status-warn/60 text-status-warn">
                Privacy non accettata
              </AdminTag>
            )}
          </div>

          {request.notes ? (
            <p className="text-sm leading-relaxed text-muted">
              <span className="font-medium text-foreground">Note del cliente: </span>
              {request.notes}
            </p>
          ) : null}
        </AdminCard>
      </div>

      {/* Files */}
      <AdminCard className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-base font-bold text-foreground">
          File allegati
        </h2>
        <QuoteFilesTable files={request.files} />
      </AdminCard>
    </div>
  );
}