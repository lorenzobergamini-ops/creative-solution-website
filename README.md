# Creative Solution — Sito Web

Sito ufficiale di **Creative Solution**, brand italiano di stampa 3D e contenuti
maker/tecnologici. Repository del sito pubblico (home, servizi, galleria), form
preventivo con upload file 3D, email di notifica e pannello admin privato.

> **Stato attuale: galleria collegata a Supabase (fase M2).** Le pagine
> pubbliche (home, servizi, come funziona, contatti, privacy) e la galleria
> pubblica (griglia, filtri per categoria, pagina dettaglio con lightbox
> accessibile, sezione "Lavori recenti" in home) leggono i progetti
> pubblicati da Supabase con fallback grazioso se le credenziali non sono
> configurate. Mancano: form preventivo (M3), email (M4) e pannello admin
> (M5).

## Stack

| Componente      | Scelta                                                     |
| --------------- | ---------------------------------------------------------- |
| Framework       | Next.js 16.3.4 (App Router, Server Components, SSR)        |
| Linguaggio      | TypeScript (strict)                                        |
| Styling         | Tailwind CSS 3.4.17 (+ PostCSS, Autoprefixer)              |
| Font            | next/font/google: Inter (testo) + Space Grotesk (titoli)   |
| Database/Backend| Supabase (Postgres + Auth + Storage), RLS                  |
| Email           | Resend (fase M4)                                           |
| Anti-bot        | Cloudflare Turnstile (fase M3)                             |
| Deploy          | Vercel (dominio proprio, non sottodominio piattaforma)     |
| Package manager | npm                                                        |

## Struttura delle cartelle

```
├── .env.example            # template variabili d'ambiente (committato)
├── public/                 # asset statici
├── src/
│   ├── app/
│   │   ├── globals.css     # design system (CSS variables + Tailwind)
│   │   ├── layout.tsx      # root layout: font, metadati, accent override
│   │   ├── page.tsx        # home (incl. "Lavori recenti" da Supabase)
│   │   ├── galleria/
│   │   │   ├── page.tsx    # griglia progetti + filtri categoria
│   │   │   └── [slug]/page.tsx  # dettaglio progetto + lightbox
│   │   └── …               # servizi, come-funziona, contatti, privacy
│   ├── components/
│   │   ├── gallery/        # card, lightbox, filtri, empty state
│   │   └── …               # ui.tsx, Header, Footer, icons
│   ├── lib/
│   │   ├── supabase/       # client browser + client server (letture pubbliche)
│   │   ├── gallery.ts      # accesso dati galleria (M2)
│   │   └── site-settings.ts
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql   # schema iniziale: enum, tabelle, RLS, bucket
│   └── seed_demo.sql       # DATI DI ESEMPIO (da eliminare in produzione)
├── tailwind.config.ts      # mappa i colori/font alle CSS variables
├── postcss.config.mjs
└── package.json
```

## Setup e variabili d'ambiente

1. Installa le dipendenze: `npm install`
2. Copia il template in `.env.local` e compila i valori reali **solo lì**:

   ```bash
   cp .env.example .env.local
   ```

   I valori reali (chiavi Supabase/Resend/Turnstile) non vanno mai committati.
   In produzione le stesse variabili si impostano nella dashboard di Vercel.
   Vedi `.env.example` per la descrizione di ogni variabile.

## Comandi

```bash
npm run dev        # server di sviluppo (http://localhost:3000)
npm run lint       # ESLint
npm run typecheck  # TypeScript strict (tsc --noEmit)
npm run build      # build di produzione
npm start          # serve la build di produzione
```

## Decisioni tecniche e default

Tutte le scelte non specificate nel brief, con motivazione.

- **Versione Next.js: 16.3.4** — installata da `create-next-app@latest` al
  momento dello scaffold (settembre 2026). React 19.2.8, ESLint 9 (flat config,
  script `lint` = `eslint` diretto: Next 16 non usa più `next lint`).
- **Tailwind CSS 3.4.17 (non v4)** — richiesto dal brief per stabilità e
  compatibilità con il design system a CSS variables. `create-next-app` oggi
  installa Tailwind v4 di default: è stato **downgradato** a 3.4.17 con
  `postcss.config.mjs` classico (`tailwindcss` + `autoprefixer`) e
  `tailwind.config.ts` che mappa i token a `var(--background)`, `var(--surface)`,
  `var(--border)`, `var(--foreground)`, `var(--muted)`, `var(--accent)`.
- **Design system** — tema scuro grafite di default (niente `prefers-color-scheme`:
  il sito è scuro per scelta di brand, in tutte le modalità). Mobile-first:
  le utility Tailwind si scrivono base-mobile e si raffinano con prefissi `md:`/`lg:`.
- **Accent color** — default verde lime elettrico `#C8F031` nella CSS variable
  `--accent` (globals.css). L'alternativa arancione `#F97316` è documentata nel
  CSS e nelle variabili d'ambiente ma **non** applicata di default. Override in
  ordine di precedenza: (1) variabile `NEXT_PUBLIC_ACCENT_COLOR` → inline style
  su `<html>` in `layout.tsx`; (2) pannello admin → `site_settings.accent_color`
  (fasi M2+). Il progetto funziona anche senza override.
- **Font** — Inter (testo) e Space Grotesk (titoli) via `next/font/google`:
  caricati e auto-ottimizzati a build time, nessun `<link>` esterno. Variabili
  CSS `--font-sans` / `--font-display`, mappate in `tailwind.config.ts`.
- **Fallback email notifiche** — il mittente/destinatario dei preventivi si
  configura in `site_settings.notifications_email` dal pannello admin; finché il
  valore è vuoto il sistema usa `RESEND_FROM_EMAIL` (env). Nessun allegato 3D
  nelle email (solo link), come da analisi tecnica.
- **Schema database** — colonne non indicate esplicitamente come nullable nel
  brief sono `NOT NULL` dove sono campi obbligatori del form (`client_name`,
  `client_email`, `contact_preference`, `project_title`, `description`); i
  boolean (`has_3d_file`, `rights_confirmed`, `privacy_accepted`) hanno default
  `false` per sicurezza. Chiavi primarie `uuid` con `gen_random_uuid()`; FK con
  `on delete cascade` per quote_files e gallery_images.
- **RLS e scritture** — nessuna policy di scrittura per anon/authenticated su
  nessuna tabella: tutte le mutazioni avvengono lato server con
  `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS). Letture pubbliche solo sulla
  galleria pubblicata; `quote_requests`/`quote_files` deny-by-default;
  `site_settings` leggibile dall'admin autenticato (protezione di rotta col
  middleware nelle fasi successive); `profiles` leggibile solo sul proprio id.
- **Bucket storage** — `gallery` (pubblico, read anon, write solo service role)
  e `quote-files` (privato, nessuna policy pubblica, accesso solo via signed
  URL emesse dal server). Creati in modo idempotente nella migrazione
  (`on conflict do nothing`); in alternativa si possono creare manualmente
  dalla dashboard Supabase (Storage → New bucket) con le stesse regole.
- **`.env.local`** — creato vuoto/commentato per lo sviluppo locale; è in
  `.gitignore` (insieme a `.env` e `.env.*`). `.env.example` è committato come
  template e non è ignorato.
- **Workspace di lavoro (solo questo ambiente)** — la partizione `/home` è
  limitata (~300 MB), quindi `node_modules` e `.next` sono **bind mount** verso
  `/var/creative-solution/` (spazio su disco più ampio). Sono artefatti
  rigenerabili. Se dopo un riavvio dell'ambiente i mount mancano, ricrearli:

  ```bash
  sudo mkdir -p /var/creative-solution/node_modules /var/creative-solution/.next
  cd /home/team/shared/creative-solution
  mkdir -p node_modules .next        # mountpoint (directory vuote)
  sudo mount --bind /var/creative-solution/node_modules node_modules
  sudo mount --bind /var/creative-solution/.next .next
  npm install --cache /var/cache/npm-cs   # cache su /var, mai su /home
  ```

  NB: **non** usare symlink per `node_modules`: npm li sostituisce con
  directory reali su `/home` e riempie la partizione (verificato su questo
  ambiente).

## Galleria pubblica (fase M2)

- La galleria legge `gallery_projects` + `gallery_images` **solo pubblicati**
  (`is_published = true`), tramite RLS (policy `select` per anon/authenticated).
- Client Supabase: `src/lib/supabase/server.ts` (letture pubbliche con anon key,
  nessun cookie → le pagine restano prerenderizzate con ISR) e
  `src/lib/supabase/client.ts` (client browser, base per le fasi admin).
  La service role key vive solo in variabili d'ambiente server: **mai** nel
  client o nel repo.
- **Fallback grazioso**: senza `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` non viene creato alcun client e le funzioni
  di `src/lib/gallery.ts` restituiscono liste vuote: la build passa anche in
  CI senza credenziali e la UI mostra l'empty state onesto
  "Nessun progetto pubblicato ancora".
- Immagini: bucket storage pubblico `gallery`, URL
  `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/<path>`.
  `next.config.ts` autorizza i domini `*.supabase.co` / `*.supabase.in` per
  `next/image`. Se un'immagine manca o non carica, la UI mostra il placeholder
  onesto "Immagine in attesa" — mai URL esterni casuali.
- ISR: le pagine della galleria sono rigenerate ogni 5 minuti
  (`export const revalidate = 300`): i progetti pubblicati dal pannello admin
  appaiono senza bisogno di redeploy.

## Database: migrazioni e seed

**Migrazione** — `supabase/migrations/0001_init.sql` crea enum, tabelle,
trigger, indici, policy RLS e bucket storage (in modo idempotente).
Modo 1 (dashboard Supabase): progetto → **SQL Editor** → incolla il contenuto
del file → **Run**. Modo 2 (Supabase CLI), dalla cartella del repo con il
progetto linkato:

```bash
supabase db push          # applica le migrazioni (deploy preview / remote)
supabase start            # avvia lo stack locale
supabase db reset         # applica le migrazioni al DB locale
```

**Seed demo** — `supabase/seed_demo.sql` inserisce 4 progetti dimostrativi
(titoli con suffisso " (Esempio)", descrizioni segnaposto esplicite e
immagini inesistenti che mostrano "Immagine in attesa"): serve a vedere
griglia, filtri e lightbox durante lo sviluppo. È **DATI DI ESEMPIO**:
applicarlo solo in ambienti di sviluppo/demo, **mai in produzione**.

```bash
# Applicare il seed (SQL Editor della dashboard, oppure):
supabase db push

# Rimuovere il seed (per ripartire puliti o in produzione):
#   delete from public.gallery_images;
#   delete from public.gallery_projects;
```