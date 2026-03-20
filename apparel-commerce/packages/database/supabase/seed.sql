-- Seed data for apparel-commerce
-- Run with: pnpm db:seed

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'staff', 'customer');
create type public.order_channel as enum ('web', 'pos');
create type public.order_status as enum (
  'draft',
  'pending_payment',
  'paid',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);
create type public.payment_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded',
  'voided'
);
create type public.shipment_status as enum (
  'pending',
  'label_created',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned'
);
create type public.inventory_reason as enum (
  'opening_stock',
  'purchase',
  'reservation',
  'reservation_release',
  'sale',
  'return',
  'adjustment',
  'damage',
  'transfer_in',
  'transfer_out'
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  image text,
  role public.user_role not null default 'customer',
  google_sub text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text,
  full_name text not null,
  phone text,
  line1 text not null,
  line2 text,
  barangay text,
  city text not null,
  province text,
  postal_code text,
  country_code text not null default 'PH',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text,
  status text not null default 'draft',
  brand text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  barcode text unique,
  size text not null,
  color text not null,
  price numeric(12,2) not null,
  compare_at_price numeric(12,2),
  cost numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, size, color)
);

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null default 'warehouse',
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  qty_delta integer not null,
  reason public.inventory_reason not null,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  order_id uuid,
  qty integer not null check (qty > 0),
  status text not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.users(id) on delete set null,
  billing_address_id uuid references public.addresses(id) on delete set null,
  shipping_address_id uuid references public.addresses(id) on delete set null,
  channel public.order_channel not null default 'web',
  status public.order_status not null default 'draft',
  currency text not null default 'PHP',
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stock_reservations
  add constraint stock_reservations_order_id_fkey
  foreign key (order_id) references public.orders(id) on delete cascade;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku_snapshot text not null,
  product_name_snapshot text not null,
  size_snapshot text not null,
  color_snapshot text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'lemonsqueezy',
  checkout_id text,
  external_order_id text,
  payment_link_url text,
  status public.payment_status not null default 'pending',
  amount numeric(12,2) not null,
  currency text not null default 'PHP',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier_slug text not null default 'jtexpress-ph',
  aftership_tracking_id text,
  tracking_number text unique,
  label_url text,
  status public.shipment_status not null default 'pending',
  last_checkpoint text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text,
  event_type text not null,
  signature text,
  payload jsonb not null,
  status text not null default 'received',
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, event_id)
);

create index idx_variants_product_id on public.product_variants(product_id);
create index idx_inventory_movements_variant_location on public.inventory_movements(variant_id, location_id);
create index idx_stock_reservations_variant_status on public.stock_reservations(variant_id, status, expires_at);
create index idx_orders_customer_id on public.orders(customer_id);
create index idx_orders_status_channel on public.orders(status, channel);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_payments_order_id on public.payments(order_id);
create index idx_shipments_order_id on public.shipments(order_id);
create index idx_webhook_events_provider_status on public.webhook_events(provider, status);
