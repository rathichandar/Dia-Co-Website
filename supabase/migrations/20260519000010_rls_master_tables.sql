-- Public read access on master/reference tables.
-- These are reference data (metals, shapes, etc.) with no security concerns;
-- both anonymous and authenticated users can read.
-- Postgres does NOT support CREATE POLICY IF NOT EXISTS, so each policy is
-- guarded by DROP POLICY IF EXISTS first for idempotency.

drop policy if exists "metals_public_read" on metals;
create policy "metals_public_read" on metals
  for select
  to anon, authenticated
  using (true);

drop policy if exists "stone_types_public_read" on stone_types;
create policy "stone_types_public_read" on stone_types
  for select
  to anon, authenticated
  using (true);

drop policy if exists "stone_shapes_public_read" on stone_shapes;
create policy "stone_shapes_public_read" on stone_shapes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "setting_styles_public_read" on setting_styles;
create policy "setting_styles_public_read" on setting_styles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "product_types_public_read" on product_types;
create policy "product_types_public_read" on product_types
  for select
  to anon, authenticated
  using (true);
