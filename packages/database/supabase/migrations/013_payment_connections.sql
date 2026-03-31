-- BYOK payment connection metadata (platform layer).
-- Commerce transaction truth remains in Medusa.

create table if not exists public.payment_connections (
  id text primary key,
  provider text not null,
  region_id text,
  label text not null default '',
  mode text not null default 'sandbox',
  status text not null default 'draft',
  webhook_status text not null default 'unknown',
  last_verified_at timestamptz,
  last_test_result text,
  secret_ciphertext text not null,
  secret_hint text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by_email text,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_connections
  drop constraint if exists payment_connections_provider_check;
alter table public.payment_connections
  add constraint payment_connections_provider_check
  check (provider in ('stripe', 'paypal', 'paymongo', 'lemonsqueezy', 'cod'));

alter table public.payment_connections
  drop constraint if exists payment_connections_mode_check;
alter table public.payment_connections
  add constraint payment_connections_mode_check
  check (mode in ('sandbox', 'production'));

alter table public.payment_connections
  drop constraint if exists payment_connections_status_check;
alter table public.payment_connections
  add constraint payment_connections_status_check
  check (status in ('draft', 'sandbox_verified', 'enabled', 'disabled', 'verification_failed'));

alter table public.payment_connections
  drop constraint if exists payment_connections_webhook_status_check;
alter table public.payment_connections
  add constraint payment_connections_webhook_status_check
  check (webhook_status in ('unknown', 'healthy', 'failing'));

create index if not exists idx_payment_connections_provider_region
  on public.payment_connections(provider, region_id);

create index if not exists idx_payment_connections_status_mode
  on public.payment_connections(status, mode);

alter table public.payment_connections enable row level security;

drop policy if exists payment_connections_deny_anon on public.payment_connections;
create policy payment_connections_deny_anon
  on public.payment_connections for all
  to anon
  using (false)
  with check (false);

drop policy if exists payment_connections_deny_authenticated on public.payment_connections;
create policy payment_connections_deny_authenticated
  on public.payment_connections for all
  to authenticated
  using (false)
  with check (false);
