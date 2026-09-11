import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import { ArrowRightIcon } from "@/components/icons";
import { ButtonLink, Container, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Servizi",
  description:
    "Stampa 3D su richiesta, pezzi personalizzati, prototipi e progettazione 3D. Scopri le aree di servizio di Creative Solution e richiedi un preventivo.",
};

const SERVICES = [
  {
    number: "01",
    title: "Stampa 3D su richiesta",
    lead: "Il servizio principale: trasformiamo file 3D e idee in oggetti fisici.",
    points: [
      "Stampa di pezzi a partire da un file fornito da te (STL, OBJ, 3MF o archivio ZIP)",
      "Oggetti unici, piccole serie e ricambi",
      "Valutazione di fattibilità e consigli sui materiali prima di iniziare",
    ],
  },
  {
    number: "02",
    title: "Pezzi personalizzati e prototipi",
    lead: "Quando serve un componente che non si trova pronto, lo realizziamo.",
    points: [
      "Componenti disegnati attorno alle tue esigenze",
      "Prototipi da testare e iterare prima della produzione",
      "Ottimizzazione del progetto per la stampa 3D",
    ],
  },
  {
    number: "03",
    title: "Progettazione e modellazione 3D",
    lead: "Parti da zero? Ti aiutiamo a creare il file, dal concetto al modello.",
    points: [
      "Modellazione 3D a partire da descrizioni, disegni o foto",
      "Progetto di pezzi nuovi o riproduzione di oggetti esistenti",
      "Consulenza su materiale, orientamento e struttura del pezzo",
    ],
  },
] as const;

export default async function ServiziPage() {
  const settings = await getSiteSettings();

  return (
    <main>
      {/* Page hero */}
      <section className="bg-grid border-b border-border">
        <Container className="flex max-w-3xl flex-col gap-5 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Servizi
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Stampa 3D e progettazione, su richiesta
          </h1>
          <p className="text-base leading-relaxed text-muted md:text-lg">
            Ogni progetto è diverso: per questo non proponiamo listini
            standard, ma valutiamo ogni richiesta e rispondiamo con un
            preventivo personalizzato. Qui trovi le aree di servizio in cui
            possiamo aiutarti.
          </p>
        </Container>
        <div className="bg-layers h-2 w-full" aria-hidden="true" />
      </section>

      {/* Detailed services */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-14 py-16 md:py-24">
          {SERVICES.map((service) => (
            <article
              key={service.number}
              className="grid gap-6 border border-border bg-surface p-7 md:grid-cols-[auto_1fr] md:gap-10 md:p-10"
            >
              <span className="font-display text-4xl font-bold text-accent md:text-5xl">
                {service.number}
              </span>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                    {service.title}
                  </h2>
                  <p className="text-base text-muted">{service.lead}</p>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {service.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90"
                    >
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 bg-accent"
                        aria-hidden="true"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </Container>
      </section>

      {/* Materials */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <SectionHeading
            eyebrow="Materiali"
            title="I materiali che lavoriamo"
            description="La lista è configurabile dal pannello admin, in arrivo con le prossime fasi del sito. La disponibilità effettiva viene verificata insieme in fase di preventivo."
          />

          <div className="flex flex-wrap gap-3">
            {settings.materials.map((material) => (
              <span
                key={material}
                className="border border-border bg-surface px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-foreground"
              >
                {material}
              </span>
            ))}
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Le caratteristiche di ogni materiale (resistenza, finitura,
            utilizzo) dipendono dal progetto: te le illustriamo in fase di
            preventivo, consigliandoti la scelta più adatta al tuo scopo.
          </p>

          {/*
            TODO(M2): read `materials` from the site_settings table (DB)
            instead of the defaults in src/lib/site-settings.ts, so the
            admin can edit the list from the panel without touching code.
          */}
        </Container>
      </section>

      {/* No 3D file? */}
      <section className="border-b border-border">
        <Container>
          <div className="bg-grid flex flex-col gap-6 border border-border px-7 py-12 md:px-12 md:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Non hai un file 3D?
            </p>
            <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Nessun problema: ti aiutiamo noi a progettarlo
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted">
              Puoi inviarci una descrizione della tua idea, un disegno o anche
              una semplice foto: ci occupiamo noi della progettazione e della
              modellazione 3D, e ti proponiamo il percorso più adatto prima di
              iniziare qualsiasi lavoro.
            </p>
            <div className="mt-2">
              <ButtonLink href="/preventivo">
                Racconta il tuo progetto
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="bg-surface">
        <Container className="flex flex-col items-center gap-6 py-16 text-center md:py-24">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Vuoi sapere quanto costa il tuo progetto?
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted">
            Invia la tua richiesta: la valutiamo e ti rispondiamo con un
            preventivo personalizzato, senza impegno.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <ButtonLink href="/preventivo">Richiedi un preventivo</ButtonLink>
            <ButtonLink href="/come-funziona" variant="secondary">
              Come funziona
            </ButtonLink>
          </div>
        </Container>
      </section>
    </main>
  );
}