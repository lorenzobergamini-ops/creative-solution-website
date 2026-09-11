# Configurazione del cloud Supabase — Guida passo passo

Questa guida ti accompagna nella creazione del database e dello storage del sito
Creative Solution su **Supabase**. Non serve alcuna competenza tecnica: basta
seguire i 4 passaggi qui sotto.

Il file da incollare è `supabase/setup/cloud-setup.sql` (nella cartella `setup`
del repository). Un team ti fornirà il contenuto completo da copiare.

---

## Passo 1 — Creare il progetto

1. Vai su **supabase.com** e accedi (se non hai un account, crealo; è gratuito).
2. Clicca **New project** (Nuovo progetto).
3. Compila i campi come segue:
   - **Organization**: scegli o crea la tua organizzazione.
   - **Project name**: suggerito `creative-solution` (puoi cambiarlo, non è critico).
   - **Database Password**: scegli una password sicura e **annotala subito da
     qualche parte** (la vedrai solo ora; servirà per l'accesso diretto al
     database). Conservala in un posto sicuro.
   - **Region**: seleziona **Frankfurt (eu-central-1)** — la più vicina
     all'Italia, quindi la più veloce per noi.
   - **Plan**: lascia **Free** (gratuito, sufficiente per iniziare).
4. Clicca **Create new project**. La creazione richiede qualche minuto; aspetta
   che termini (lo stato diventa verdi, "Project is initializing" scompare).

## Passo 2 — Eseguire lo script di configurazione

1. Nel menu laterale sinistro del dashboard clicca su **SQL Editor**.
2. Clicca **New query** (nuova query).
3. Incolla **l'INTERO contenuto** del file `cloud-setup.sql` nell'area di testo.
   Non omettere nulla: lo script crea tabelle, regole di sicurezza, storage e
   dati iniziali in un colpo solo.
4. Clicca **Run** (Esegui).
5. A fine esecuzione deve comparire il messaggio **Success** (in verde).
   Lo script è progettato per poter essere rieseguito in sicurezza: se per un
   motivo qualsiasi lo esegui una seconda volta, non dà errori.

## Passo 3 — Recuperare le 3 chiavi API

1. Nel menu laterale clicca **Project Settings** (Impostazioni progetto) →
   voce **API** (in alto, sotto "Configuration").
2. Troverai tre valori da comunicare a chi configura il sito (verranno salvati
   come variabili d'ambiente nella piattaforma di deploy — non ti serve saperne
   di più ora, ma serviranno al team):
   - **Project URL** (l'indirizzo del progetto; inizia con `https://...`);
   - **anon public key** (chiave pubblica, iniziacon `eyJ...`);
   - **service_role secret key** (chiave segreta, inizia con `eyJ...`).

   Mappatura con il repository:
   | Valore nel pannello Supabase | Variabile d'ambiente |
   | ---------------------------- | -------------------- |
   | Project URL                  | `NEXT_PUBLIC_SUPABASE_URL` |
   | anon public key              | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | service_role secret key      | `SUPABASE_SERVICE_ROLE_KEY` |

   > ⚠️ **ATTENZIONE — chiave service_role**: è una **master key** che può
   > leggere e scrivere TUTTO il database, aggirando le protezioni. Trattala
   > come una password: **non condividerla mai** in chat, email o documenti.
   > Va inserita SOLO come "Secret" nelle impostazioni della piattaforma di
   > deploy (o direttamente da te, se il team ti mostra come) — mai nel codice
   > del sito.

## Passo 4 — Verifica finale

Dopo il Run dello script, controlla che tutto sia stato creato:

1. **Database → Schema Editor** (menu laterale): devono comparire le tabelle
   - `profiles`
   - `quote_requests`
   - `quote_files`
   - `gallery_projects`
   - `gallery_images`
   - `site_settings` (contiene anche l'accento blu `#38BDF8` e i social)
   - `quote_rate_limits`
2. **Storage** (menu laterale): devono comparire i bucket
   - `gallery` (pubblico — contiene le foto della galleria)
   - `quote-files` (privato — contiene i file 3D caricati dai clienti)

Se vedi tutto questo, la configurazione cloud è completa. ✅

---

### Note per il team (non servono al proprietario)
- Lo script consolidato è ricavato da `supabase/migrations/0001_init.sql` +
  `0002_rate_limit.sql` con l'aggiunta di guard idempotenti sulle operazioni
  che Postgres non rende ripetibili da sé (`create type`, `create trigger`,
  `create policy`). I file originali in `supabase/migrations/` non sono stati
  modificati; `supabase/setup/cloud-setup.sql` va mantenuto allineato se le
  migrazioni cambiano.
- Dopo il merge della PR, il proprietario può copiare il file dall'URL raw:
  `https://raw.githubusercontent.com/lorenzobergamini-ops/creative-solution-website/main/supabase/setup/cloud-setup.sql`