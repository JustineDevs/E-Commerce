-- Seed schema and data for apparel-commerce (idempotent)
-- Run with: pnpm db:seed

create extension if not exists "pgcrypto";

do $$ begin create type public.user_role as enum ('admin', 'staff', 'customer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_channel as enum ('web', 'pos'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('draft', 'pending_payment', 'paid', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'voided'); exception when duplicate_object then null; end $$;
do $$ begin create type public.shipment_status as enum ('pending', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'); exception when duplicate_object then null; end $$;
do $$ begin create type public.inventory_reason as enum ('opening_stock', 'purchase', 'reservation', 'reservation_release', 'sale', 'return', 'adjustment', 'damage', 'transfer_in', 'transfer_out'); exception when duplicate_object then null; end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  image text,
  role public.user_role not null default 'customer',
  google_sub text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
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

create table if not exists public.products (
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

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
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

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null default 'warehouse',
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
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

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  order_id uuid,
  qty integer not null check (qty > 0),
  status text not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
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

do $$ begin alter table public.stock_reservations add constraint stock_reservations_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade; exception when duplicate_object then null; end $$;

create table if not exists public.order_items (
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

create table if not exists public.payments (
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

create table if not exists public.shipments (
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

create table if not exists public.webhook_events (
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

create index if not exists idx_variants_product_id on public.product_variants(product_id);
create index if not exists idx_inventory_movements_variant_location on public.inventory_movements(variant_id, location_id);
create index if not exists idx_stock_reservations_variant_status on public.stock_reservations(variant_id, status, expires_at);
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_status_channel on public.orders(status, channel);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_shipments_order_id on public.shipments(order_id);
create index if not exists idx_webhook_events_provider_status on public.webhook_events(provider, status);

-- Seed sample data
insert into public.inventory_locations (code, name, kind) values ('WH1', 'Warehouse', 'warehouse') on conflict (code) do nothing;
insert into public.products (slug, name, description, category, status, brand) values
  ('classic-shorts', 'Classic Cargo Shorts', 'Comfortable cotton cargo shorts for everyday wear.', 'Shorts', 'active', 'InHouse'),
  ('slim-fit-shorts', 'Slim Fit Chino Shorts', 'Lightweight chino shorts with a modern fit.', 'Shorts', 'active', 'InHouse')
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, sort_order)
select p.id, 'https://placehold.co/600x800/e2e8f0/64748b?text=Product', 0 from public.products p 
where p.slug in ('classic-shorts', 'slim-fit-shorts') and not exists (select 1 from public.product_images pi where pi.product_id = p.id);

insert into public.product_variants (product_id, sku, barcode, size, color, price, is_active)
select p.id, 'CS-S-BLK', '1234567890001', 'S', 'Black', 1299.00, true from public.products p where p.slug = 'classic-shorts' and not exists (select 1 from public.product_variants pv where pv.product_id = p.id and pv.sku = 'CS-S-BLK')
union all select p.id, 'CS-M-BLK', '1234567890002', 'M', 'Black', 1299.00, true from public.products p where p.slug = 'classic-shorts' and not exists (select 1 from public.product_variants pv where pv.product_id = p.id and pv.sku = 'CS-M-BLK')
union all select p.id, 'CS-L-BLK', '1234567890003', 'L', 'Black', 1299.00, true from public.products p where p.slug = 'classic-shorts' and not exists (select 1 from public.product_variants pv where pv.product_id = p.id and pv.sku = 'CS-L-BLK')
union all select p.id, 'SF-S-NAV', '1234567890011', 'S', 'Navy', 1499.00, true from public.products p where p.slug = 'slim-fit-shorts' and not exists (select 1 from public.product_variants pv where pv.product_id = p.id and pv.sku = 'SF-S-NAV')
union all select p.id, 'SF-M-NAV', '1234567890012', 'M', 'Navy', 1499.00, true from public.products p where p.slug = 'slim-fit-shorts' and not exists (select 1 from public.product_variants pv where pv.product_id = p.id and pv.sku = 'SF-M-NAV');

insert into public.inventory_movements (variant_id, location_id, qty_delta, reason)
select pv.id, il.id, 50, 'opening_stock'::public.inventory_reason
from public.product_variants pv
cross join public.inventory_locations il
where il.code = 'WH1'
and not exists (select 1 from public.inventory_movements im where im.variant_id = pv.id and im.location_id = il.id);

-- Row Level Security (idempotent): public catalog only for anon/authenticated; backend uses service_role.
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.users enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (status = 'active');

drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants for select to anon, authenticated using (
  is_active = true
  and exists (select 1 from public.products p where p.id = product_variants.product_id and p.status = 'active')
);

drop policy if exists images_public_read on public.product_images;
create policy images_public_read on public.product_images for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_images.product_id and p.status = 'active')
);
