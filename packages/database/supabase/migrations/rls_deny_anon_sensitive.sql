-- Defense in depth: explicit DENY for Supabase `anon` on sensitive tables.
-- Catalog read policies remain in enable_rls.sql; service_role bypasses RLS for the Node API.
-- Apply after enable_rls.sql.

drop policy if exists orders_deny_anon on public.orders;
create policy orders_deny_anon on public.orders for all to anon using (false) with check (false);

drop policy if exists order_items_deny_anon on public.order_items;
create policy order_items_deny_anon on public.order_items for all to anon using (false) with check (false);

drop policy if exists payments_deny_anon on public.payments;
create policy payments_deny_anon on public.payments for all to anon using (false) with check (false);

drop policy if exists shipments_deny_anon on public.shipments;
create policy shipments_deny_anon on public.shipments for all to anon using (false) with check (false);

drop policy if exists inventory_movements_deny_anon on public.inventory_movements;
create policy inventory_movements_deny_anon on public.inventory_movements for all to anon using (false) with check (false);

drop policy if exists stock_reservations_deny_anon on public.stock_reservations;
create policy stock_reservations_deny_anon on public.stock_reservations for all to anon using (false) with check (false);

drop policy if exists inventory_locations_deny_anon on public.inventory_locations;
create policy inventory_locations_deny_anon on public.inventory_locations for all to anon using (false) with check (false);

drop policy if exists webhook_events_deny_anon on public.webhook_events;
create policy webhook_events_deny_anon on public.webhook_events for all to anon using (false) with check (false);

drop policy if exists users_deny_anon on public.users;
create policy users_deny_anon on public.users for all to anon using (false) with check (false);

drop policy if exists addresses_deny_anon on public.addresses;
create policy addresses_deny_anon on public.addresses for all to anon using (false) with check (false);
