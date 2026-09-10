import type { Metadata } from "next";
import { getPublishedProjects } from "@/lib/gallery";
import { Container, SectionHeading } from "@/components/ui";
import { GalleryEmptyState } from "@/components/gallery/GalleryEmptyState";
import { GalleryView } from "@/components/gallery/GalleryView";

export const metadata: Metadata = {
  title: "Galleria",
  description:
    "I progetti realizzati da Creative Solution: stampa 3D FDM e in resina, pezzi personalizzati, prototipi e progettazione.",
};

/**
 * ISR: the gallery is statically generated and refreshed every 5 minutes,
 * so projects published from the admin panel appear without a redeploy.
 */
export const revalidate = 300;

export default async function GalleriaPage() {
  // Graceful: returns [] when Supabase is not configured (honest empty state).
  const projects = await getPublishedProjects();

  return (
    <main>
      <section className="border-b border-border">
        <Container className="flex flex-col gap-6 py-16 md:py-20">
          <SectionHeading
            eyebrow="Galleria"
            title="I nostri lavori"
            description="Progetti realizzati e pubblicati, categoria per categoria. Seleziona un progetto per vedere i dettagli e le immagini."
          />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-12 md:py-16">
          {projects.length === 0 ? (
            <GalleryEmptyState />
          ) : (
            <GalleryView projects={projects} />
          )}
        </Container>
      </section>
    </main>
  );
}