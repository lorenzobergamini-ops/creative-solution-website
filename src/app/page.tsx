import type { Metadata } from "next";
import Link from "next/link";
import { getLatestProjects } from "@/lib/gallery";
import { getSiteSettings } from "@/lib/site-settings";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CubeMark,
  InstagramIcon,
  TikTokIcon,
} from "@/components/icons";
import {
  ButtonLink,
  Container,
  SectionHeading,
} from "@/components/ui";
import { GalleryCard } from "@/components/gallery/GalleryCard";
import { GalleryEmptyState } from "@/components/gallery/GalleryEmptyState";

export const metadata: Metadata = {
  title: "Dalla tua idea a un oggetto reale",
  description:
    "Stampa 3D su richiesta, pezzi personalizzati, prototipi e progettazione. Raccontaci la tua idea: ricevi un preventivo personalizzato da Creative Solution.",
};

const SERVICES = [
  {
    title: "Stampa 3D su richiesta",
    description:
      "Realizziamo oggetti in stampa 3D a partire dal tuo file o dalla tua idea. Ogni richiesta viene valutata caso per caso, senza impegno.",
  },
  {
    title: "Pezzi personalizzati e prototipi",
    description:
      "Componenti unici, ricambi e prototipi da testare. Parliamo del tuo progetto e troviamo insieme la soluzione giusta per le tue esigenze.",
  },
  {
    title: "Progettazione e modellazione 3D",
    description:
      "Non hai un file 3D? Ti aiutiamo a progettarlo e modellarlo partendo da una descrizione, un disegno o una semplice foto.",
  },
] as const;

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Raccontaci l'idea",
    description: "Inviaci la descrizione del progetto o il tuo file 3D.",
  },
  {
    step: "02",
    title: "Analisi e valutazione",
    description: "Esaminiamo fattibilità, materiali e dettagli tecnici.",
  },
  {
    step: "03",
    title: "Preventivo personalizzato",
    description: "Ricevi una proposta su misura, senza impegno.",
  },
  {
    step: "04",
    title: "Realizzazione e consegna",
    description: "Produciamo il tuo oggetto e concordiamo la consegna.",
  },
] as const;

export default async function Home() {
  const settings = getSiteSettings();
  // Graceful: returns [] when Supabase is not configured (honest empty state).
  const latestProjects = await getLatestProjects(6);

  return (
    <main>
      {/* ------------------------------------------------------------ */}
      {/* Hero                                                         */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-grid relative overflow-hidden border-b border-border">
        <Container className="relative flex flex-col gap-10 py-20 md:py-28 lg:flex-row lg:items-center lg:gap-16 lg:py-32">
          <div className="flex max-w-2xl flex-col items-start gap-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Stampa 3D e contenuti maker
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Dalla tua idea a un{" "}
              <span className="text-accent">oggetto reale.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted md:text-lg">
              Stampa 3D su richiesta, progettazione e preventivi personalizzati:
              trasformiamo le tue idee in oggetti fisici, pezzo per pezzo.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <ButtonLink href="/preventivo">Richiedi un preventivo</ButtonLink>
              <ButtonLink href="/galleria" variant="secondary">
                Esplora i lavori
              </ButtonLink>
            </div>
          </div>

          {/* Decorative isometric cube (placeholder brand artwork) */}
          <div className="hidden flex-1 items-center justify-center lg:flex" aria-hidden="true">
            <div className="relative">
              <div className="absolute inset-0 border border-border" />
              <div className="absolute inset-3 border border-border/60" />
              <CubeMark className="relative h-64 w-64 text-accent" />
            </div>
          </div>
        </Container>
        <div className="bg-layers h-2 w-full" aria-hidden="true" />
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Servizi                                                      */}
      {/* ------------------------------------------------------------ */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Servizi"
              title="Cosa possiamo realizzare per te"
              description="Tre aree di servizio per coprire il tuo progetto dall'idea al prodotto finito. Nessun dettaglio viene lasciato al caso."
            />
            <ButtonLink href="/servizi" variant="secondary" className="shrink-0">
              Tutti i servizi
              <ArrowRightIcon className="h-4 w-4" />
            </ButtonLink>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {SERVICES.map((service, index) => (
              <article
                key={service.title}
                className="group flex flex-col gap-4 border border-border bg-surface p-7 transition-colors hover:border-accent"
              >
                <span className="font-display text-3xl font-bold text-border transition-colors group-hover:text-accent">
                  0{index + 1}
                </span>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {service.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Processo in 4 passaggi                                       */}
      {/* ------------------------------------------------------------ */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <SectionHeading
            eyebrow="Come funziona"
            title="Un processo semplice, senza sorprese"
            description="Quattro passaggi chiari per passare dall'idea all'oggetto. Il dettaglio di ogni fase è spiegato nella pagina dedicata."
          />

          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((item) => (
              <li
                key={item.step}
                className="relative flex flex-col gap-3 border border-border p-6"
              >
                <span className="font-display text-sm font-bold tracking-[0.3em] text-accent">
                  {item.step}
                </span>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>

          <div>
            <Link
              href="/come-funziona"
              className="group inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.15em] text-accent"
            >
              Scopri come funziona nel dettaglio
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Lavori recenti                                               */}
      {/* ------------------------------------------------------------ */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Galleria"
              title="Lavori recenti"
              description="Gli ultimi progetti pubblicati sulla galleria."
            />
            <ButtonLink href="/galleria" variant="secondary" className="shrink-0">
              Vedi tutti
              <ArrowRightIcon className="h-4 w-4" />
            </ButtonLink>
          </div>

          {latestProjects.length === 0 ? (
            <GalleryEmptyState />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latestProjects.map((project) => (
                <GalleryCard key={project.id} project={project} compact />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Social                                                       */}
      {/* ------------------------------------------------------------ */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <SectionHeading
            eyebrow="Social"
            title="Seguici dove condividiamo i lavori"
            description="Contenuti maker, progetti e anteprime: Creative Solution è anche qui."
            align="center"
          />

          <div className="mx-auto grid w-full max-w-2xl gap-5 sm:grid-cols-2">
            <a
              href={settings.socialInstagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-5 border border-border bg-surface p-7 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center border border-border text-accent">
                  <InstagramIcon className="h-6 w-6" />
                </span>
                <ArrowUpRightIcon className="h-5 w-5 text-muted transition-colors group-hover:text-accent" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-display text-lg font-bold text-foreground">
                  Instagram
                </p>
                <p className="text-sm text-muted">@creativesolution.2024</p>
              </div>
            </a>

            <a
              href={settings.socialTiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-5 border border-border bg-surface p-7 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center border border-border text-accent">
                  <TikTokIcon className="h-6 w-6" />
                </span>
                <ArrowUpRightIcon className="h-5 w-5 text-muted transition-colors group-hover:text-accent" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-display text-lg font-bold text-foreground">
                  TikTok
                </p>
                <p className="text-sm text-muted">@bergaminisamuele</p>
              </div>
            </a>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* CTA finale                                                   */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-surface">
        <Container className="flex flex-col items-center gap-6 py-16 text-center md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Pronti a iniziare
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Hai un&apos;idea da trasformare in un oggetto?
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted">
            Raccontaci il tuo progetto: ti risponderemo con una valutazione e
            un preventivo personalizzato, senza impegno.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <ButtonLink href="/preventivo">Richiedi un preventivo</ButtonLink>
            <ButtonLink href="/contatti" variant="secondary">
              Contattaci
            </ButtonLink>
          </div>
        </Container>
      </section>
    </main>
  );
}