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
