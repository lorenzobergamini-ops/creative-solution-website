import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchAdminProjectDetail } from "@/lib/admin";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { AdminEmptyState } from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Modifica progetto",
};

/**
 * /admin/galleria/[id] — edit an existing project (published or hidden).
 * Data fetched server-side with the service role; auth gate in the layout.
 */
export default async function AdminGalleryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchAdminProjectDetail(id);

  if (result.status === "unavailable") {
    return (
      <div className="flex flex-col gap-6">
        <AdminEmptyState
          title="Configurazione non disponibile"
          description="Il progetto non è disponibile: completa la configurazione Supabase per modificarlo."
        />
      </div>
    );
  }
  if (result.status === "missing") {
    notFound();
  }

  return <ProjectForm project={result.data} />;
}