# Creative Solution — Sito Web

Sito ufficiale di **Creative Solution**, brand italiano di stampa 3D e contenuti
maker/tecnologici. Repository del sito pubblico (home, servizi, galleria), form
preventivo con upload file 3D, email di notifica e pannello admin privato.

> **Stato attuale: M3+M4+M5 implementati (form preventivo, email di notifica,
> pannello admin).**
> Le pagine pubbliche (home, servizi, come funziona, contatti, privacy), la
> galleria pubblica (M2), il form preventivo multi-step (M3: 5 passaggi,
> validazione Zod client+server, upload file 3D con signed URL verso un bucket
> privato, Turnstile, rate limiting), le email di notifica Resend (M4: notifica
> admin + conferma cliente, senza allegati) e il pannello admin (M5: auth,
> richieste, galleria, impostazioni) sono implementati. Il flusso completo
> verrà testato end-to-end quando saranno disponibili le credenziali Supabase
> e Resend; senza credenziali tutto degrada con messaggi chiari e la build
> resta verde.

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
│   │   ├── actions/quote.ts  # server actions del form preventivo (M3)
│   │   ├── preventivo/     # form preventivo multi-step (M3)
│   │   ├── galleria/
│   │   │   ├── page.tsx    # griglia progetti + filtri categoria
│   │   │   └── [slug]/page.tsx  # dettaglio progetto + lightbox
│   │   └── …               # servizi, come-funziona, contatti, privacy
│   ├── components/
│   │   ├── gallery/        # card, lightbox, filtri, empty state
│   │   ├── quote/          # wizard preventivo + widget Turnstile (M3)
│   │   └── …               # ui.tsx, Header, Footer, icons
│   ├── lib/
│   │   ├── supabase/       # client browser/server + client service-role (M3)
│   │   ├── validations/quote.ts  # schema Zod condiviso (M3)
│   │   ├── upload.ts       # limiti/validazione/path upload (M3)
│   │   ├── turnstile.ts    # verifica token lato server (M3)
│   │   ├── emails.ts       # email transazionali Resend (M4)
│   │   ├── gallery.ts      # accesso dati galleria (M2)
│   │   └── site-settings.ts
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql   # schema iniziale: enum, tabelle, RLS, bucket
│   │   └── 0002_rate_limit.sql  # rate limiting form preventivo (M3)
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
- **Accent color** — default blu chiaro neon `#38BDF8` nella CSS variable
  `--accent` (globals.css). L'alternativa arancione `#F97316` è documentata nel
  CSS e nelle variabili d'ambiente ma **non** applicata di default. Override in
  ordine di precedenza: (1) variabile `NEXT_PUBLIC_ACCENT_COLOR` → inline style
  su `<html>` in `layout.tsx`; (2) pannello admin → `site_settings.accent_color`
  (fasi M2+). Il progetto funziona anche senza override.
- **Font** — Inter (testo) e Space Grotesk (titoli) via `next/font/google`:
  caricati e auto-ottimizzati a build time, nessun `<link>` esterno. Variabili
  CSS `--font-sans` / `--font-display`, mappate in `tailwind.config.ts`.
- **Email notifiche (M4)** — mittente `RESEND_FROM_EMAIL` (dominio verificato
  in Resend, SPF/DKIM); destinatario admin `site_settings.notifications_email`
  dal pannello admin, con fallback a `RESEND_FROM_EMAIL` se vuoto. Ogni valore
  utente è HTML-escaped prima di entrare nei template; nessun allegato 3D
  nelle email (solo link/ID), come da analisi tecnica. Senza env l'invio è
  saltato con un log e il form non si blocca mai.
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

## Form preventivo multi-step (fase M3)

La pagina `/preventivo` implementa un wizard a 5 passaggi (contatti, progetto,
file 3D, riferimenti visivi, riepilogo) con validazione Zod condivisa
client+server, upload sicuro dei file 3D e degradazione senza credenziali.

**Validazione (doppia, mai fidarsi del client)**

- Schema condiviso: `src/lib/validations/quote.ts` (`quoteFormSchema` +
  tipo `QuoteFormData`). Il client usa lo stesso schema (esteso con i campi
  `File` transitori) via `zodResolver` per errori immediati in italiano;
  ogni server action riesegue `safeParse` lato server e rifiuta input non
  validi.
- Condizione "file 3D o link Drive/WeTransfer": gestita nel wizard (schema
  client con `superRefine`), il server la riapplica in `createSignedUploadUrls`
  (la richiesta con `has_3d_file=true` senza file resta comunque visibile
  all'admin in M5).

**Flusso upload con signed URL (browser → bucket privato)**

1. `createQuoteRequest(formData)` — valida, verifica Turnstile, applica il
   rate limit e inserisce la riga in `quote_requests` con `status='new'`.
2. `createSignedUploadUrls(quoteRequestId, files)` — rivalida ogni file
   (estensione/MIME/dimensione contro `site_settings`, con default in
   `src/lib/upload.ts`), verifica che la richiesta esista e sia `'new'`,
   genera il percorso `quotes/{requestId}/{uuid}.{ext}` (mai il nome
   originale nel percorso), emette una signed upload URL per file (60 min,
   bucket privato `quote-files`) e inserisce le righe in `quote_files` con
   `status='pending'`. L'azione è idempotente: una seconda chiamata elimina
   le righe `pending` precedenti e riemette URL freschi (serve al retry).
3. Il browser carica ogni file direttamente verso l'URL firmato (XHR con
   barra di progresso per file, `Content-Type` dichiarato). Le operazioni
   che richiedono il service role non passano MAI dal client: la chiave sta
   solo nelle env server e i client browser non la vedono.
4. `completeQuoteUpload(quoteRequestId, storagePaths)` — verifica su
   storage che ogni oggetto esista (list della cartella) e marca le righe
   `quote_files` come `uploaded`. Le email di notifica (M4) NON partono da
   qui: vengono inviate una sola volta da `createQuoteRequest` (punto 1),
   senza allegati 3D — solo link/ID (vedi sezione successiva).

Se l'upload fallisce ma la richiesta è salvata, la UI mostra lo stato
"parziale" con pulsante **Riprova upload** (riparte dal punto 2).

**Turnstile (anti-bot)**

- Client: il widget è renderizzato SOLO se `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  è impostata; altrimenti compare un badge discreto "Protezione anti-bot non
  configurata (modalità sviluppo)" — la chiave non viene mai inventata.
- Server (`src/lib/turnstile.ts`): se `TURNSTILE_SECRET_KEY` manca,
  `verifyTurnstileToken` restituisce `{ success: true, debug: 'not-configured' }`
  (**modalità dev documentata**, TODO(M6): in produzione fallire chiuso);
  se la chiave c'è ma il token manca o non supera `siteverify`, la richiesta
  viene rifiutata.

**Rate limiting (M3 semplice, TODO(M6) definitivo)** — migrazione
`supabase/migrations/0002_rate_limit.sql`: tabella append-only
`quote_rate_limits` (una riga per richiesta riuscita e per scope `email`/`ip`,
hash sha256, nessun dato personale). Regole: max 3 richieste per email/24h e
5 per IP/ora, contate con finestra scorrevole sulle righe; pulizia
opportunistica delle righe oltre le 48h. Scelta documentata: un log
append-only è più semplice e corretto di bucket aggregati (che richiedono
upsert atomici) per l'M3; il rate limit definitivo (M6) lo sostituirà.

**Limiti upload configurabili** — `MAX_FILE_SIZE_MB` (default 50) e
`ALLOWED_MODEL_EXTENSIONS` sono in `src/lib/upload.ts`; il server legge
`max_file_size_mb` e `allowed_file_extensions` da `site_settings` (seed in
0001) quando esistono. La UI mostra i default statici (`getSiteSettings()`);
il server è l'autorità e rifiuta i file non conformi all'emissione delle
signed URL.

**Operazioni manuali residue**

- I bucket storage (`gallery` pubblico, `quote-files` privato) sono creati
  idempotentemente da `0001_init.sql`; in alternativa creali dalla dashboard
  (Storage → New bucket): `quote-files` **privato** e senza policy di
  lettura anonima.
- Applica le migrazioni (SQL Editor o `supabase db push`): ora servono sia
  `0001_init.sql` sia `0002_rate_limit.sql`.
- Per il test end-to-end servono le credenziali in `.env.local` (o Vercel):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` e, per l'anti-bot,
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (le chiavi
  Turnstile si creano su dash.cloudflare.com).
- TODO(M6): scansione antivirus/ZIP dei file caricati prima che l'admin li
  apra (hook segnato in `src/lib/validations/quote.ts`).

## Email di notifica (fase M4)

Modulo `src/lib/emails.ts` (server-only, importato dalle server actions del
form): email transazionali via **Resend** (pacchetto `resend`), template HTML
inline brand dark+accent, senza dipendenze react-email. Ogni valore fornito
dall'utente passa da `escapeHtml` prima di entrare nel template (mai input raw
nell'HTML).

**Quando partono** — una sola volta per richiesta, da `createQuoteRequest`
(il punto unico del flusso: ogni richiesta ci passa esattamente una volta,
mentre `completeQuoteUpload` gira solo se ci sono file da caricare). Un errore
email non blocca mai il submit (try/catch separato, TODO(M6) coda di retry).

1. **Notifica admin** — oggetto `Nuova richiesta di preventivo — {titolo}`;
   destinatario `site_settings.notifications_email` (pannello admin →
   Impostazioni) oppure, se vuoto, `RESEND_FROM_EMAIL`. Corpo: dati della
   richiesta (nome, email, telefono se presente, preferenza di contatto,
   materiale/colore/quantità, descrizione troncata) e link **"Apri nel
   pannello"** → `{NEXT_PUBLIC_APP_URL}/admin/richieste/{id}` (path relativo
   se l'URL non è configurato).
2. **Conferma cliente** — oggetto `Abbiamo ricevuto la tua richiesta —
   Creative Solution`; destinatario l'email del cliente. Contiene il
   riferimento richiesta (`#XXXXXXXX`), un riepilogo essenziale e i link
   social (Instagram/TikTok da `site_settings`). **Nessuna promessa di tempi
   o prezzi**: solo "ti risponderemo al più presto con un preventivo
   personalizzato".

**Mai allegati**: i file 3D restano nel bucket privato `quote-files`; le
email contengono solo link/ID (l'admin scarica i file con signed URL di 5
minuti dal pannello).

**Degradazione senza env**: se `RESEND_API_KEY` o `RESEND_FROM_EMAIL`
mancano, l'invio viene saltato con un log (`{ok:false, reason:'not-configured'}`):
la build resta verde e il submit del form non si blocca mai.

**Configurazione Resend (prima della produzione)**

1. Crea un account su resend.com e un'**API key** (resend.com/api-keys) →
   valore in `RESEND_API_KEY` (env server, mai nel repo).
2. **Verifica il dominio mittente** (resend.com/domains): aggiungi al DNS del
   dominio i record **SPF e DKIM** indicati dalla dashboard Resend. Senza
   verifica l'invio fallisce. Il mittente usato nelle email è
   `RESEND_FROM_EMAIL` (es. `no-reply@dominio.it`).
3. Imposta `RESEND_FROM_EMAIL` e, in produzione, `NEXT_PUBLIC_APP_URL`
   (URL pubblico del sito, per i link assoluti nelle email).
4. Destinatario notifiche: lascia `notifications_email` vuoto per usare
   `RESEND_FROM_EMAIL`, oppure valorizzalo dal pannello admin
   (Impostazioni → Email notifiche) per ricevere le notifiche su un'altra
   casella.

## Pannello admin (fase M5)

Il pannello è su `/admin` (login `/admin/login`), protetto da Supabase Auth
**senza registrazione pubblica**: gli account si creano manualmente.

**1. Creare l'utente (dashboard Supabase)** → Authentication → Users → **Add
user** → email + password (niente invite se non serve l'email di conferma).

**2. Promuovere a admin (SQL Editor)** — il pannello verifica
`profiles.role = 'admin'` (RLS: ogni utente legge solo la propria riga):

```sql
insert into public.profiles (id, role, full_name)
values (
  (select id from auth.users where email = 'tua@email.it' limit 1),
  'admin',
  'Samuele Bergamini'
)
on conflict (id) do nothing;
```

**3. Applicare le migrazioni** (`0001_init.sql` + `0002_rate_limit.sql`) e
impostare in Vercel/`.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

**Sicurezza delle route**

- `src/middleware.ts` (Next 16: convenzione deprecata in favore di
  `proxy.ts`, ancora supportata in 16.3.4; la migrazione è un rename di file
  + `export function proxy`) protegge `/admin/*` e redirige gli utenti non
  autenticati a `/admin/login?next=…` (asset root esclusi dal matcher).
- Il layout del pannello `src/app/admin/(panel)/layout.tsx` è il gate
  **server-side** autorevole (`dynamic = "force-dynamic"`): riverifica
  sessione + ruolo via `getAdminSession()` (getUser() contro l'auth server +
  query su `profiles`).
- **Ogni** server action in `src/app/actions/admin.ts` ricomincia da
  `requireAdmin()` (sessione + ruolo): il client non è mai fidato. I dati
  privati (`quote_requests`, `quote_files`) si leggono/scrivono solo con la
  service role key (RLS deny-by-default per anon/authenticated).
- Download file: `getQuoteFileSignedUrl` genera URL firmati di 5 minuti sul
  bucket privato `quote-files`. **Mai URL pubblici.**
- Upload galleria: `uploadGalleryImage` carica lato server (service role)
  verso `gallery/{projectId}/{uuid}.{ext}`; eliminazione con rollback
  dell'oggetto storage.
- Senza credenziali tutto degrada: le pagine admin mostrano l'empty state
  onesto "Configurazione non disponibile" e la build resta verde.

**Impostazioni** (`/admin/impostazioni`) — upsert su `site_settings`:
`notifications_email` (destinatario notifiche M4), `accent_color` (con
anteprima live; applicata al sito pubblico dal root layout con precedenza
env > DB > default), social, contatti, materiali, estensioni e dimensione
max upload. `getSiteSettings()` (src/lib/site-settings.ts) legge i valori
dal DB con fallback ai default e le pagine pubbliche li usano.

## Database: migrazioni e seed

**Migrazione** — `supabase/migrations/0001_init.sql` crea enum, tabelle,
trigger, indici, policy RLS e bucket storage (in modo idempotente);
`0002_rate_limit.sql` aggiunge la tabella di rate limiting del form.
Modo 1 (dashboard Supabase): progetto → **SQL Editor** → incolla il contenuto
dei file (in ordine) → **Run**. Modo 2 (Supabase CLI), dalla cartella del repo
con il progetto linkato:

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