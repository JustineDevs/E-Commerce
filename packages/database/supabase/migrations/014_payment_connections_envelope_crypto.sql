-- Envelope encryption metadata for BYOK payment connections.
-- Inner payload remains AES-256-GCM; DEK is wrapped by AWS KMS (production) or local KEK (dev).

alter table public.payment_connections
  add column if not exists crypto_scheme text not null default 'v1-direct';

alter table public.payment_connections
  drop constraint if exists payment_connections_crypto_scheme_check;

alter table public.payment_connections
  add constraint payment_connections_crypto_scheme_check
  check (crypto_scheme in ('v1-direct', 'aws-kms-envelope', 'local-kek-envelope'));

alter table public.payment_connections
  add column if not exists kek_key_id text;

alter table public.payment_connections
  add column if not exists crypto_key_version int;

alter table public.payment_connections
  add column if not exists secret_rotated_at timestamptz;

comment on column public.payment_connections.crypto_scheme is
  'v1-direct: legacy single-key GCM in secret_ciphertext. aws-kms-envelope: DEK from KMS, encrypted DEK stored in payload. local-kek-envelope: DEK wrapped with PAYMENT_CONNECTIONS_ENCRYPTION_KEY (dev only).';

comment on column public.payment_connections.kek_key_id is
  'KMS key ARN or alias when crypto_scheme is aws-kms-envelope.';
