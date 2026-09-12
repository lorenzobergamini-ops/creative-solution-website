-- ============================================================
-- Creative Solution — SETUP SUPABASE (cloud-setup.sql)
-- ------------------------------------------------------------
-- SCOPO: crea in un'unica esecuzione tutto lo schema cloud del
-- sito Creative Solution, combinando:
--   1. la migrazione 0001_init.sql
--      (enum, tabelle, trigger, indici, policy RLS su schema public)
--   2. la migrazione 0002_rate_limit.sql (tabella quote_rate_limits)
--
-- In dettaglio crea:
--   * enum  : quote_status, service_type
--   * tabelle: profiles, quote_requests, quote_files,
--              gallery_projects, gallery_images, site_settings
--              (con seed, incluso accent_color #38BDF8),
--              quote_rate_limits
--   * funzione + trigger aggiornamento updated_at
--   * indici di supporto alle query
--   * policy Row Level Security (RLS) sulle tabelle public
--   * I bucket Storage (gallery, quote-files) si creano dal
--     dashboard (Storage -> New bucket), NON via SQL (vedi sotto)
--
-- IDEMPOTENTE: puo' essere eseguito due volte senza errori.
-- Uso: aprire SQL Editor sul progetto Supabase -> New query ->
-- incollare l'INTERO contenuto di questo file -> Run.
-- Dopo il Run: creare i 2 bucket dall'interfaccia Storage.
-- ============================================================

-- ============================================================
-- PARTE 1/2 — supabase/migrations/0001_init.sql
-- (con guard idempotenti aggiunti dove l'originale non lo era;
--  i file originali in supabase/migrations/ NON sono modificati)
-- ============================================================

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
-- GUARD IDEMPOTENTE (aggiunto solo qui, non in 0001_init.sql):
-- Postgres non supporta "create type ... if not exists", quindi
-- avvolgiamo la creazione in un DO block che controlla prima se
-- il tipo esiste gia' (to_regtype). Alla seconda esecuzione il
-- blocco non fa nulla; il resto dello script riusa il tipo.
do $$
begin
  if to_regtype('public.quote_status') is null then
    create type public.quote_status as enum (
      'new',
      'in_analysis',
      'quote_sent',
      'accepted',
      'rejected',
      'completed',
      'archived'
    );
  end if;
end
$$;

-- GUARD IDEMPOTENTE (come sopra, per service_type).
do $$
begin
  if to_regtype('public.service_type') is null then
    create type public.service_type as enum (
      'fdm_print',
      'resin_print',
      'custom_parts',
      'prototypes',
      'design_3d',
      'other'
    );
  end if;
end
$$;

-- ------------------------------------------------------------
-- Helper: set_updated_at trigger function
-- (create or replace: gia' idempotente nell'originale)
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles — single admin profile, linked to auth.users
-- (create table if not exists: gia' idempotente)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- quote_requests — quote requests from the public form
-- ------------------------------------------------------------
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  status quote_status not null default 'new',
  client_name text not null,
  client_email text not null,
  client_phone text,
  contact_preference text not null,
  project_title text not null,
  description text not null,
  quantity integer not null default 1,
  material text,
  color text,
  deadline text,
  notes text,
  has_3d_file boolean not null default false,
  drive_link text,
  rights_confirmed boolean not null default false,
  privacy_accepted boolean not null default false,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- quote_files — uploaded 3D files attached to a quote request
-- ------------------------------------------------------------
create table if not exists public.quote_files (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  file_type text not null check (file_type in ('model', 'reference')),
  mime_type text,
  size_bytes bigint,
  status text not null default 'pending' check (status in ('pending', 'uploaded', 'failed')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- gallery_projects — published 3D-printing projects
-- ------------------------------------------------------------
create table if not exists public.gallery_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  service_type service_type,
  material text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- gallery_images — images belonging to a gallery project
-- ------------------------------------------------------------
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gallery_projects (id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- site_settings — key/value settings editable by the admin
-- ------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Seed: default settings (no real personal data; empty fields fall back
-- to env vars at runtime, e.g. RESEND_FROM_EMAIL for notifications).
-- (on conflict do nothing: gia' idempotente — alla seconda esecuzione
--  i valori non vengono sovrascritti)
insert into public.site_settings (key, value) values
  ('notifications_email', ''),
  ('accent_color', '#38BDF8'),
  ('social_instagram', 'https://www.instagram.com/creativesolution.2024/'),
  ('social_tiktok', 'https://www.tiktok.com/@bergaminisamuele'),
  ('contact_email', ''),
  ('contact_whatsapp', ''),
  ('materials', '["PLA","PETG","ABS","Resina"]'),
  ('allowed_file_extensions', '["stl","obj","3mf","zip"]'),
  ('max_file_size_mb', '50')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
-- GUARD IDEMPOTENTE (aggiunto solo qui, non in 0001_init.sql):
-- "create trigger" fallisce alla seconda esecuzione con
-- "trigger already exists" -> drop if exists prima di ricreare.
-- Ricreare il trigger identico non modifica alcun dato.
drop trigger if exists set_updated_at_quote_requests on public.quote_requests;
create trigger set_updated_at_quote_requests
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_gallery_projects on public.gallery_projects;
create trigger set_updated_at_gallery_projects
  before update on public.gallery_projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_site_settings on public.site_settings;
create trigger set_updated_at_site_settings
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Indexes
-- (create index if not exists: gia' idempotente)
-- ------------------------------------------------------------
create index if not exists quote_requests_status_idx
  on public.quote_requests (status);
create index if not exists quote_requests_created_at_idx
  on public.quote_requests (created_at desc);
create index if not exists quote_files_quote_request_id_idx
  on public.quote_files (quote_request_id);
create index if not exists gallery_projects_published_sort_idx
  on public.gallery_projects (is_published, sort_order);
create index if not exists gallery_images_project_published_idx
  on public.gallery_images (project_id, is_published);

-- ------------------------------------------------------------
-- Row Level Security
-- (enable row level security: gia' idempotente — nessun errore
--  se l'esecuzione viene ripetuta)
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_files enable row level security;
alter table public.gallery_projects enable row level security;
alter table public.gallery_images enable row level security;
alter table public.site_settings enable row level security;

-- profiles: authenticated users can read only their own row.
-- GUARD IDEMPOTENTE (aggiunto solo qui, non in 0001_init.sql):
-- "create policy" fallisce alla seconda esecuzione con
-- "policy already exists" -> drop if exists prima di ricreare.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- quote_requests & quote_files: NO policies — deny by default for anon
-- and authenticated. Access only via service_role from the server.
-- (Intentionally no policy statements here.)

-- gallery: public read-only access to published content only.
drop policy if exists "gallery_projects_select_published" on public.gallery_projects;
create policy "gallery_projects_select_published"
  on public.gallery_projects
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists "gallery_images_select_published" on public.gallery_images;
create policy "gallery_images_select_published"
  on public.gallery_images
  for select to anon, authenticated
  using (is_published = true);

-- site_settings: readable by the authenticated admin (route protected by
-- middleware in the app). No write policies: writes via service_role only.
drop policy if exists "site_settings_select_authenticated" on public.site_settings;
create policy "site_settings_select_authenticated"
  on public.site_settings
  for select to authenticated
  using (true);

-- ------------------------------------------------------------
-- Storage: NON creabile via SQL nelle versioni recenti di
-- Supabase (storage.* e' di proprieta' di supabase_storage_admin;
-- il ruolo postgres riceve "42501: must be owner of table objects").
-- Creare i 2 bucket dall'interfaccia (Storage -> New bucket):
--   1. name "gallery"      -> Public bucket: ON
--   2. name "quote-files"  -> Public bucket: OFF (privato)
-- NOTA: un bucket pubblico e' leggibile da chiunque tramite la
-- public URL, senza policy su storage.objects: la lettura della
-- galleria funziona senza ulteriori passaggi. Le scritture
-- avvengono solo con service_role (bypassa RLS).
-- ============================================================
-- ============================================================
-- PARTE 2/2 — supabase/migrations/0002_rate_limit.sql
-- (gia' pienamente idempotente: create table/index if not exists
--  + enable row level security; nessun guard aggiunto)
-- ============================================================

create table if not exists public.quote_rate_limits (
  id uuid primary key default gen_random_uuid(),
  -- 'email' or 'ip': which scope this attempt belongs to.
  scope text not null check (scope in ('email', 'ip')),
  -- sha256 hex digest of the normalized value (lowercased email / client IP).
  -- Hashes only: no personal data is stored.
  scope_hash text not null,
  -- Timestamp of the attempt (row = one attempt).
  window_start timestamptz not null,
  -- Link to the request that was created (null while recording).
  quote_request_id uuid references public.quote_requests (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Sliding-window counts.
create index if not exists quote_rate_limits_scope_hash_window_idx
  on public.quote_rate_limits (scope, scope_hash, window_start desc);

-- Cleanup (retention window).
create index if not exists quote_rate_limits_window_start_idx
  on public.quote_rate_limits (window_start);

-- Deny by default: this table is written/read ONLY by server actions via
-- the service-role key (RLS bypassed). No anon/authenticated policies.
alter table public.quote_rate_limits enable row level security;