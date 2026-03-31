-- Remove Lemon Squeezy from BYOK payment_connections (provider retired from the app).

delete from public.payment_connections where provider = 'lemonsqueezy';

alter table public.payment_connections
  drop constraint if exists payment_connections_provider_check;
alter table public.payment_connections
  add constraint payment_connections_provider_check
  check (provider in (
    'stripe',
    'paypal',
    'paymongo',
    'maya',
    'cod',
    'aftership'
  ));
