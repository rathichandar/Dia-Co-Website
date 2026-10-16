-- DEV-ONLY RLS: these policies grant anon/authenticated full read access to
-- operational tables. They MUST be replaced with proper per-user policies before
-- any real customer signs up. This unblocks Phase 2 development against
-- demo data. Tracked in the auth-design session backlog.
--
-- Each table gets:
--   1. A permissive SELECT policy (drop-if-exists then create, since Postgres
--      has no CREATE POLICY IF NOT EXISTS).
--   2. Postgres-level GRANT SELECT to anon and authenticated (the project has
--      "Automatically expose new tables" disabled, so grants must be explicit).

-- ─── customers ───────────────────────────────────────────────
drop policy if exists "customers_dev_read" on customers;
create policy "customers_dev_read" on customers
  for select to anon, authenticated using (true);
grant select on customers to anon;
grant select on customers to authenticated;

-- ─── users ───────────────────────────────────────────────────
drop policy if exists "users_dev_read" on users;
create policy "users_dev_read" on users
  for select to anon, authenticated using (true);
grant select on users to anon;
grant select on users to authenticated;

-- ─── user_notification_preferences ───────────────────────────
drop policy if exists "user_notification_preferences_dev_read" on user_notification_preferences;
create policy "user_notification_preferences_dev_read" on user_notification_preferences
  for select to anon, authenticated using (true);
grant select on user_notification_preferences to anon;
grant select on user_notification_preferences to authenticated;

-- ─── orders ──────────────────────────────────────────────────
drop policy if exists "orders_dev_read" on orders;
create policy "orders_dev_read" on orders
  for select to anon, authenticated using (true);
grant select on orders to anon;
grant select on orders to authenticated;

-- ─── order_metals ────────────────────────────────────────────
drop policy if exists "order_metals_dev_read" on order_metals;
create policy "order_metals_dev_read" on order_metals
  for select to anon, authenticated using (true);
grant select on order_metals to anon;
grant select on order_metals to authenticated;

-- ─── order_center_stones ─────────────────────────────────────
drop policy if exists "order_center_stones_dev_read" on order_center_stones;
create policy "order_center_stones_dev_read" on order_center_stones
  for select to anon, authenticated using (true);
grant select on order_center_stones to anon;
grant select on order_center_stones to authenticated;

-- ─── order_accent_stones ─────────────────────────────────────
drop policy if exists "order_accent_stones_dev_read" on order_accent_stones;
create policy "order_accent_stones_dev_read" on order_accent_stones
  for select to anon, authenticated using (true);
grant select on order_accent_stones to anon;
grant select on order_accent_stones to authenticated;

-- ─── cad_versions ────────────────────────────────────────────
drop policy if exists "cad_versions_dev_read" on cad_versions;
create policy "cad_versions_dev_read" on cad_versions
  for select to anon, authenticated using (true);
grant select on cad_versions to anon;
grant select on cad_versions to authenticated;

-- ─── cad_version_renders ─────────────────────────────────────
drop policy if exists "cad_version_renders_dev_read" on cad_version_renders;
create policy "cad_version_renders_dev_read" on cad_version_renders
  for select to anon, authenticated using (true);
grant select on cad_version_renders to anon;
grant select on cad_version_renders to authenticated;

-- ─── cad_version_metal_weights ───────────────────────────────
drop policy if exists "cad_version_metal_weights_dev_read" on cad_version_metal_weights;
create policy "cad_version_metal_weights_dev_read" on cad_version_metal_weights
  for select to anon, authenticated using (true);
grant select on cad_version_metal_weights to anon;
grant select on cad_version_metal_weights to authenticated;

-- ─── cad_version_center_stones ───────────────────────────────
drop policy if exists "cad_version_center_stones_dev_read" on cad_version_center_stones;
create policy "cad_version_center_stones_dev_read" on cad_version_center_stones
  for select to anon, authenticated using (true);
grant select on cad_version_center_stones to anon;
grant select on cad_version_center_stones to authenticated;

-- ─── cad_version_accent_stones ───────────────────────────────
drop policy if exists "cad_version_accent_stones_dev_read" on cad_version_accent_stones;
create policy "cad_version_accent_stones_dev_read" on cad_version_accent_stones
  for select to anon, authenticated using (true);
grant select on cad_version_accent_stones to anon;
grant select on cad_version_accent_stones to authenticated;

-- ─── cad_version_quote_lines ─────────────────────────────────
drop policy if exists "cad_version_quote_lines_dev_read" on cad_version_quote_lines;
create policy "cad_version_quote_lines_dev_read" on cad_version_quote_lines
  for select to anon, authenticated using (true);
grant select on cad_version_quote_lines to anon;
grant select on cad_version_quote_lines to authenticated;

-- ─── order_history_events ────────────────────────────────────
drop policy if exists "order_history_events_dev_read" on order_history_events;
create policy "order_history_events_dev_read" on order_history_events
  for select to anon, authenticated using (true);
grant select on order_history_events to anon;
grant select on order_history_events to authenticated;

-- ─── order_messages ──────────────────────────────────────────
drop policy if exists "order_messages_dev_read" on order_messages;
create policy "order_messages_dev_read" on order_messages
  for select to anon, authenticated using (true);
grant select on order_messages to anon;
grant select on order_messages to authenticated;

-- ─── order_attachments ───────────────────────────────────────
drop policy if exists "order_attachments_dev_read" on order_attachments;
create policy "order_attachments_dev_read" on order_attachments
  for select to anon, authenticated using (true);
grant select on order_attachments to anon;
grant select on order_attachments to authenticated;
