import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProjectBySlug,
  getPublishedProjects,
} from "@/lib/gallery";
import { ButtonLink, Container } from "@/components/ui";
import { ProjectImage } from "@/components/gallery/ProjectImage";
import { ProjectImageStrip } from "@/components/gallery/ProjectImageStrip";

export const revalidate = 300;

/**
 * Prerender the detail pages of all published projects at build time.
 * Without Supabase configured this returns [] and the page is rendered
 * on demand (still fine: getProjectBySlug falls back to notFound()).
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const projects = await getPublishedProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return { title: "Progetto non trovato" };
  }
  return {
    title: project.title,
    description:
      project.description ??
      `Progetto di ${project.category ?? "stampa 3D"} realizzato da Creative Solution.`,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const quoteHref = `/preventivo?titolo=${encodeURIComponent(project.title)}`;

  return (
    <main>
      {/* Hero: cover + info */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-20 lg:flex-row lg:items-start lg:gap-14">
          <div className="relative aspect-[4/3] w-full overflow-hidden border border-border bg-background lg:w-1/2">
            <ProjectImage
              url={project.coverUrl}
              alt={project.coverAlt}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>

          <div className="flex flex-1 flex-col items-start gap-5">
            {project.category ? (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                {project.category}
              </p>
            ) : null}
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {project.title}
            </h1>
            <p className="text-base leading-relaxed text-muted">
              {project.description ??
                "Descrizione del progetto in arrivo."}
            </p>
            <dl className="flex flex-col gap-3 border-t border-border pt-5 text-sm">
              {project.category ? (
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 uppercase tracking-[0.2em] text-muted">
                    Categoria
                  </dt>
                  <dd className="text-foreground">{project.category}</dd>
                </div>
              ) : null}
              {project.material ? (
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 uppercase tracking-[0.2em] text-muted">
                    Materiale
                  </dt>
                  <dd className="text-foreground">{project.material}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-2">
              <ButtonLink href={quoteHref}>Richiedi un preventivo</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Image strip with lightbox */}
      {project.images.length > 1 ? (
        <section className="border-b border-border">
          <Container className="flex flex-col gap-6 py-12 md:py-16">
            <h2 className="font-display text-xl font-bold text-foreground">
              Altre immagini
            </h2>
            <ProjectImageStrip project={project} />
          </Container>
        </section>
      ) : null}
    </main>
  );
}