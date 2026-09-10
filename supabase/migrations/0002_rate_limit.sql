-- ============================================================
-- Creative Solution — 0002_rate_limit.sql
-- Rate limiting for the public quote form (milestone M3).
--
-- Chosen design (documented in README.md, "Form preventivo"):
-- append-only ATTEMPT LOG. Every successful quote-request submission
-- records one row per scope ('email' hash and 'ip' hash). The server
-- actions count rows inside a sliding window:
--   * max 3 requests per email address in 24h
--   * max 5 requests per IP in 1h
-- Rows older than 48h are deleted opportunistically by the server action.
--
-- Rationale vs alternatives:
--   * aggregate buckets with request_count + PK(scope_hash, window_start)
--     require read-then-upsert (racy) or raw SQL to increment atomically;
--   * counting directly on quote_requests would cover the email rule but
--     NOT the IP rule (quote_requests has no IP column by design, GDPR).
-- An append-only log is the simplest correct implementation for M3 and
-- gets replaced by a definitive limiter in M6 (see TODO(M6)).
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