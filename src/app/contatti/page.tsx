import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import {
  ArrowUpRightIcon,
  InstagramIcon,
  MailIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { ButtonLink, Container, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contatti",
  description:
    "Contatta Creative Solution: profili social ufficiali su Instagram e TikTok, email e WhatsApp. Per un preventivo usa il form dedicato.",
};

export default function ContattiPage() {
  const settings = getSiteSettings();

  const emailNotConfigured = settings.contactEmail.length === 0;
  const whatsappNotConfigured = settings.contactWhatsapp.length === 0;

  return (
    <main>
      {/* Page hero */}
      <section className="bg-grid border-b border-border">
        <Container className="flex max-w-3xl flex-col gap-5 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Contatti
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Parliamo del tuo progetto
          </h1>
          <p className="text-base leading-relaxed text-muted md:text-lg">
            Puoi seguirci sui nostri profili social ufficiali oppure contattarci
            direttamente. Per una richiesta di preventivo, il modo più rapido è
            il form dedicato.
          </p>
        </Container>
        <div className="bg-layers h-2 w-full" aria-hidden="true" />
      </section>

      {/* Social */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <SectionHeading
            eyebrow="Social"
            title="I nostri profili ufficiali"
            description="Qui condividiamo lavori, contenuti maker e aggiornamenti."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <a
              href={settings.socialInstagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-5 border border-border bg-surface p-7 transition-colors hover:border-accent"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border text-accent">
                <InstagramIcon className="h-6 w-6" />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-display text-lg font-bold text-foreground">
                  Instagram
                </p>
                <p className="text-sm text-muted">@creativesolution.2024</p>
              </div>
              <ArrowUpRightIcon className="h-5 w-5 text-muted transition-colors group-hover:text-accent" />
            </a>

            <a
              href={settings.socialTiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-5 border border-border bg-surface p-7 transition-colors hover:border-accent"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border text-accent">
                <TikTokIcon className="h-6 w-6" />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-display text-lg font-bold text-foreground">
                  TikTok
                </p>
                <p className="text-sm text-muted">@bergaminisamuele</p>
              </div>
              <ArrowUpRightIcon className="h-5 w-5 text-muted transition-colors group-hover:text-accent" />
            </a>
          </div>
        </Container>
      </section>

      {/* Email & WhatsApp */}
      <section className="border-b border-border">
        <Container className="flex flex-col gap-10 py-16 md:py-24">
          <SectionHeading
            eyebrow="Contatti diretti"
            title="Email e WhatsApp"
            description="I recapiti verranno pubblicati qui non appena configurati dal titolare. Nessun indirizzo personale viene mostrato."
          />

          {/*
            TODO(M2): read `contact_email` and `contact_whatsapp` from the
            site_settings table (DB) via src/lib/site-settings.ts. Until then,
            the fields are explicitly shown as "not configured" — never fake
            or guessed contact values.
          */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex items-center gap-5 border border-dashed border-border bg-surface p-7">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border text-muted">
                <MailIcon className="h-6 w-6" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-display text-lg font-bold text-foreground">
                  Email
                </p>
                {emailNotConfigured ? (
                  <p className="text-sm text-muted">
                    [DA CONFIGURARE nel pannello admin]
                  </p>
                ) : (
                  <p className="text-sm text-accent">{settings.contactEmail}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5 border border-dashed border-border bg-surface p-7">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border text-muted">
                <WhatsAppIcon className="h-6 w-6" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-display text-lg font-bold text-foreground">
                  WhatsApp
                </p>
                {whatsappNotConfigured ? (
                  <p className="text-sm text-muted">
                    [DA CONFIGURARE nel pannello admin]
                  </p>
                ) : (
                  <p className="text-sm text-accent">
                    {settings.contactWhatsapp}
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Preferisci non usare gli indirizzi diretti? Per richieste di
            preventivo e informazioni sui progetti, il form dedicato è la
            strada più rapida.
          </p>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-surface">
        <Container className="flex flex-col items-center gap-6 py-16 text-center md:py-24">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Richiedi un preventivo
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted">
            Descrivi il tuo progetto nel form dedicato: potrai allegare il
            file 3D e scegliere il canale di contatto che preferisci.
          </p>
          <div className="mt-2">
            <ButtonLink href="/preventivo">Vai al form preventivo</ButtonLink>
          </div>
        </Container>
      </section>
    </main>
  );
}