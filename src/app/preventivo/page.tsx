import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { QuoteFormWizard } from "@/components/quote/QuoteFormWizard";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Preventivo",
  description:
    "Richiedi un preventivo personalizzato: raccontaci il tuo progetto, allega il file 3D e scegli come essere ricontattato.",
};

/**
 * Quote form (M3) — the wizard is a client component; this server page only
 * provides the entry point, the static settings (upload limits shown in the
 * UI) and the optional ?titolo prefill used by the gallery detail pages.
 */
export default async function PreventivoPage({
  searchParams,
}: {
  searchParams: Promise<{ titolo?: string }>;
}) {
  const { titolo } = await searchParams;
  const settings = await getSiteSettings();

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  return (
    <main>
      {/* Page hero */}
      <section className="bg-grid border-b border-border">
        <Container className="flex max-w-3xl flex-col gap-5 py-14 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Preventivo
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Raccontaci il tuo progetto
          </h1>
          <p className="text-base leading-relaxed text-muted md:text-lg">
            In 5 passaggi: i tuoi contatti, i dettagli del progetto, il file
            3D, eventuali riferimenti visivi e il riepilogo. Niente prezzi
            prestampati: riceverai un preventivo personalizzato.
          </p>
        </Container>
        <div className="bg-layers h-2 w-full" aria-hidden="true" />
      </section>

      {/* Wizard */}
      <section className="border-b border-border">
        <Container className="py-14 md:py-20">
          <QuoteFormWizard
            initialTitle={typeof titolo === "string" ? titolo : undefined}
            maxFileSizeMb={settings.maxFileSizeMb}
            allowedExtensions={settings.allowedFileExtensions}
            materials={settings.materials}
            turnstileSiteKey={turnstileSiteKey}
          />
        </Container>
      </section>
    </main>
  );
}