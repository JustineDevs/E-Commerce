-- Allow Aftership (courier tracking) credentials in the same BYOK table as payments.

alter table public.payment_connections
  drop constraint if exists payment_connections_provider_check;
alter table public.payment_connections
  add constraint payment_connections_provider_check
  check (provider in (
    'stripe',
    'paypal',
    'paymongo',
    'lemonsqueezy',
    'maya',
    'cod',
    'aftership'
  ));
