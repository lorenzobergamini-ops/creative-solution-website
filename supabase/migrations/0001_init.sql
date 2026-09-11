-- ============================================================
-- Creative Solution — 0001_init.sql
-- Initial schema: enums, tables, triggers, indexes, RLS, storage.
--
-- Security model (deny by default):
--   * ALL writes (quote_requests, quote_files, gallery, site_settings,
--     profiles) happen server-side using the service_role key, which
--     bypasses RLS. NO insert/update/delete policies are created for
--     anon/authenticated on any table.
--   * Public read access only for published gallery content.
--
-- Storage buckets are created here idempotently (ON CONFLICT DO NOTHING);
-- they can also be created manually from the Supabase dashboard
-- (Storage -> New bucket) — that alternative is documented in the README.
-- ============================================================

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type quote_status as enum (
  'new',
  'in_analysis',
  'quote_sent',
  'accepted',
  'rejected',
  'completed',
  'archived'
);

create type service_type as enum (
  'fdm_print',
  'resin_print',
  'custom_parts',
  'prototypes',
  'design_3d',
  'other'
);

-- ------------------------------------------------------------
-- Helper: set_updated_at trigger function
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
create trigger set_updated_at_quote_requests
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

create trigger set_updated_at_gallery_projects
  before update on public.gallery_projects
  for each row execute function public.set_updated_at();

create trigger set_updated_at_site_settings
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Indexes
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
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_files enable row level security;
alter table public.gallery_projects enable row level security;
alter table public.gallery_images enable row level security;
alter table public.site_settings enable row level security;

-- profiles: authenticated users can read only their own row.
create policy "profiles_select_own"
  on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- quote_requests & quote_files: NO policies — deny by default for anon
-- and authenticated. Access only via service_role from the server.
-- (Intentionally no policy statements here.)

-- gallery: public read-only access to published content only.
create policy "gallery_projects_select_published"
  on public.gallery_projects
  for select to anon, authenticated
  using (is_published = true);

create policy "gallery_images_select_published"
  on public.gallery_images
  for select to anon, authenticated
  using (is_published = true);

-- site_settings: readable by the authenticated admin (route protected by
-- middleware in the app). No write policies: writes via service_role only.
create policy "site_settings_select_authenticated"
  on public.site_settings
  for select to authenticated
  using (true);

-- ------------------------------------------------------------
-- Storage
-- ------------------------------------------------------------
-- Buckets (idempotent; alternative: create manually from the dashboard,
-- see README). 'gallery' is public, 'quote-files' is private.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('quote-files', 'quote-files', false)
on conflict (id) do nothing;

-- Storage RLS is enabled by default on Supabase; keep it explicit.
alter table storage.objects enable row level security;

-- gallery bucket: public read (anon + authenticated).
-- Writes are NOT covered by any policy: anon/authenticated cannot
-- insert/update/delete — all writes happen with service_role only.
create policy "gallery_objects_select_public"
  on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'gallery');

-- quote-files bucket: no public policies at all — stays private.
-- Access only via signed URLs issued server-side with service_role.
-- (Intentionally no policy statements for this bucket.)