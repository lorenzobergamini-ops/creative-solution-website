import type { Metadata } from "next";
import { FAQ_ITEMS } from "@/lib/faq";
import { ArrowRightIcon } from "@/components/icons";
import { ButtonLink, Container, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Come funziona",
  description:
    "Il processo di lavoro di Creative Solution in 5 passaggi: invii l'idea o il file, valutiamo, ricevi un preventivo personalizzato, realizziamo e consegniamo.",
};

const STEPS = [
  {
    number: "01",
    title: "Invii la tua idea o il file",
    description:
      "Compili la richiesta di preventivo descrivendo il progetto e, se ce l'hai, alleghi il file 3D. Anche un disegno o una foto possono bastare.",
  },
  {
    number: "02",
    title: "Analisi e valutazione",
    description:
      "Esaminiamo la richiesta: fattibilità, materiali suggeriti ed eventuali accorgimenti tecnici. Se serve, ti chiediamo chiarimenti.",
  },
  {
    number: "03",
    title: "Preventivo personalizzato",
    description:
      "Ricevi una proposta su misura per il tuo progetto, con il canale di contatto che preferisci. Nessun costo nascosto: tutto viene concordato prima.",
  },
  {
    number: "04",
    title: "Realizzazione",
    description:
      "Una volta confermato il preventivo, procediamo con la stampa (o la progettazione, se richiesta). Ti aggiorniamo sullo stato del lavoro.",
  },
  {
    number: "05",
    title: "Consegna e ritiro",
    description:
      "Concordiamo insieme la modalità di consegna più adatta: il dettaglio viene definito in fase di preventivo, prima di iniziare.",
  },
] as const;

export default function ComeFunzionaPage() {
  return (
    <main>
      {/* Page hero */}
      <section className="bg-grid border-b border-border">
        <Container className="flex max-w-3xl flex-col gap-5 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Come funziona
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Dal primo messaggio all&apos;oggetto finale
          </h1>
          <p className="text-base leading-relaxed text-muted md:text-lg">
            Un processo in cinque passaggi, chiaro e senza sorprese. Non
            promettiamo tempi o prezzi a caso: ogni dettaglio viene definito
            con te, prima di iniziare.
          </p>
        </Container>
        <div className="bg-layers h-2 w-full" aria-hidden="true" />
      </section>

      {/* Steps */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <SectionHeading
            eyebrow="Il processo"
            title="Cinque passaggi, uno alla volta"
          />
          <ol className="flex flex-col gap-5">
            {STEPS.map((item, index) => (
              <li
                key={item.number}
                className="grid gap-4 border border-border bg-surface p-7 md:grid-cols-[auto_1fr] md:gap-8 md:p-8"
              >
                <div className="flex items-start gap-4 md:flex-col md:items-start md:gap-2">
                  <span className="font-display text-3xl font-bold text-accent">
                    {item.number}
                  </span>
                  <span
                    className="hidden h-px w-10 bg-border md:block"
                    aria-hidden="true"
                  />
                  <span
                    className="text-xs font-semibold uppercase tracking-[0.25em] text-muted"
                    aria-hidden="true"
                  >
                    Fase {index + 1}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                    {item.title}
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted md:text-base">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <SectionHeading
            eyebrow="FAQ"
            title="Domande frequenti"
            description="Le risposte alle domande che riceviamo più spesso. Per tutto il resto, basta scriverci."
          />

          {/*
            TODO(M2): make FAQ items configurable from the admin panel
            (site_settings / dedicated table). List is currently static:
            src/lib/faq.ts.
          */}
          <div className="flex flex-col gap-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group border border-border bg-surface transition-colors open:border-accent"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5">
                  <span className="font-display text-base font-semibold text-foreground md:text-lg">
                    {item.question}
                  </span>
                  <span className="faq-chevron flex h-8 w-8 shrink-0 items-center justify-center border border-border text-accent">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </span>
                </summary>
                <p className="px-6 pb-6 text-sm leading-relaxed text-muted md:text-base">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="bg-surface">
        <Container className="flex flex-col items-center gap-6 py-16 text-center md:py-24">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Pronto a iniziare il tuo progetto?
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted">
            Il primo passo è semplice: inviaci la tua richiesta di preventivo.
            La analizzeremo e ti risponderemo con una proposta su misura.
          </p>
          <div className="mt-2">
            <ButtonLink href="/preventivo">
              Richiedi un preventivo
              <ArrowRightIcon className="h-4 w-4" />
            </ButtonLink>
          </div>
        </Container>
      </section>
    </main>
  );
}