import type { Metadata } from "next";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Informativa privacy del sito Creative Solution. Documento in preparazione — contenuto segnalato come da revisionare.",
};

const SECTIONS = [
  {
    title: "Quali dati saranno trattati",
    body: "I dati forniti tramite il form di preventivo: nome, email, recapito di contatto scelto, descrizione del progetto ed eventuali file allegati.",
  },
  {
    title: "Per quale finalità",
    body: "Gestire le richieste di preventivo, rispondere alle richieste di contatto e, se richiesto, realizzare il progetto. Nessun dato verrà usato per finalità diverse senza il tuo consenso.",
  },
  {
    title: "I tuoi diritti (GDPR)",
    body: "Accesso, rettifica, cancellazione, limitazione, portabilità e opposizione al trattamento, secondo quanto previsto dal Regolamento (UE) 2016/679. Le modalità di esercizio dei diritti saranno indicate nel testo definitivo.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main>
      {/* Page hero */}
      <section className="bg-grid border-b border-border">
        <Container className="flex max-w-3xl flex-col gap-5 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Privacy
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Informativa privacy
          </h1>
        </Container>
        <div className="bg-layers h-2 w-full" aria-hidden="true" />
      </section>

      <section>
        <Container className="flex flex-col gap-10 py-16 md:py-20">
          {/* Placeholder notice — NOT a legal document */}
          <div className="border border-dashed border-accent/60 bg-surface p-7 md:p-10">
            <div className="flex flex-col gap-4">
              <p className="inline-flex w-fit bg-accent px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-background">
                [DA REVISIONARE]
              </p>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Questa pagina è un segnaposto
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted md:text-base">
                Ospiterà l&apos;informativa privacy del sito Creative Solution,
                ma <strong className="text-foreground">non è ancora un documento
                legale</strong>: il testo definitivo verrà redatto e revisionato
                prima della pubblicazione del sito. Questa sezione non deve
                essere considerata consulenza legale.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-6">
              {SECTIONS.map((section) => (
                <div
                  key={section.title}
                  className="flex flex-col gap-2 border-l-2 border-border pl-5"
                >
                  <h3 className="font-display text-base font-bold text-foreground">
                    {section.title}
                  </h3>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted">
              Nota: in questa fase non sono configurati recapiti di contatto
              del titolare del trattamento. I riferimenti per l&apos;esercizio
              dei diritti saranno indicati nel documento definitivo, insieme
              ai contatti pubblicati nella pagina /contatti.
            </p>
          </div>

          {/*
            TODO(M2): replace this placeholder page with the final privacy
            policy text once the owner provides it (or approves a draft
            prepared with legal review). Never publish guessed legal terms.
          */}

          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Il trattamento dei dati personali avverrà in conformità con la
            normativa applicabile sulla protezione dei dati, secondo i principi
            di minimizzazione, limitazione delle finalità e sicurezza. Il testo
            completo dell&apos;informativa verrà pubblicato in questa pagina
            prima dell&apos;attivazione del form di preventivo.
          </p>
        </Container>
      </section>
    </main>
  );
}