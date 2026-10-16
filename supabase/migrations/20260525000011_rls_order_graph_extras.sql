-- Phase 2C Sub-session 3 — RLS migration 3 of 3.
--
-- Order-graph extras — CAD versions and their 5 child snapshot tables,
-- order_attachments, order_messages (real-time chat), order_history_events
-- (append-only audit log).
--
-- All use parent-order inheritance via EXISTS on public.orders. Same
-- defense-in-depth caveat as order_metals etc. — RLS gates by SELECT
-- visibility of the parent, not its UPDATE/DELETE status.
--
-- order_history_events is special:
--   - SELECT: parent-order inheritance
--   - INSERT: with check (false) — blocks direct inserts. History entries
--     must go through SECURITY DEFINER helper functions so they're always
--     created with a server-controlled actor + payload.
--   - No UPDATE / DELETE policies (immutable audit log).
--
-- Service_role bypasses RLS and can write history entries directly. Future
-- SECURITY DEFINER helpers (e.g., a `record_order_history` function) will
-- write entries on behalf of authenticated callers.

-- ════════════════════════════════════════════════════════════════
-- GRANTs — write access for authenticated. SELECT was granted in
-- migration 14 for these tables; we add I/U/D here.
-- ════════════════════════════════════════════════════════════════

grant insert, update, delete on public.cad_versions                to authenticated;
grant insert, update, delete on public.cad_version_renders         to authenticated;
grant insert, update, delete on public.cad_version_metal_weights   to authenticated;
grant insert, update, delete on public.cad_version_center_stones   to authenticated;
grant insert, update, delete on public.cad_version_accent_stones   to authenticated;
grant insert, update, delete on public.cad_version_quote_lines     to authenticated;
grant insert, update, delete on public.order_attachments           to authenticated;
grant insert, update, delete on public.order_messages              to authenticated;
-- order_history_events: only INSERT grant, and even that's gated by policy(false).
-- Explicit INSERT grant here so the permission-layer error message is "RLS
-- policy violation" rather than "permission denied" — easier to diagnose.
grant insert on public.order_history_events to authenticated;

-- ════════════════════════════════════════════════════════════════
-- cad_versions
-- ════════════════════════════════════════════════════════════════

create policy "cad_versions_select" on public.cad_versions for select
using (exists (select 1 from public.orders where public.orders.id = cad_versions.order_id));
create policy "cad_versions_insert" on public.cad_versions for insert
with check (exists (select 1 from public.orders where public.orders.id = cad_versions.order_id));
create policy "cad_versions_update" on public.cad_versions for update
using (exists (select 1 from public.orders where public.orders.id = cad_versions.order_id))
with check (exists (select 1 from public.orders where public.orders.id = cad_versions.order_id));
create policy "cad_versions_delete" on public.cad_versions for delete
using (exists (select 1 from public.orders where public.orders.id = cad_versions.order_id));

-- ════════════════════════════════════════════════════════════════
-- cad_version_renders, _metal_weights, _center_stones, _accent_stones,
-- _quote_lines — all child to cad_versions, which is child to orders.
-- We inherit through orders directly via a join, not through cad_versions,
-- so the EXISTS pattern stays one-hop.
-- ════════════════════════════════════════════════════════════════

create policy "cad_version_renders_select" on public.cad_version_renders for select
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_renders.cad_version_id));
create policy "cad_version_renders_insert" on public.cad_version_renders for insert
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_renders.cad_version_id));
create policy "cad_version_renders_update" on public.cad_version_renders for update
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_renders.cad_version_id))
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_renders.cad_version_id));
create policy "cad_version_renders_delete" on public.cad_version_renders for delete
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_renders.cad_version_id));

create policy "cad_version_metal_weights_select" on public.cad_version_metal_weights for select
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_metal_weights.cad_version_id));
create policy "cad_version_metal_weights_insert" on public.cad_version_metal_weights for insert
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_metal_weights.cad_version_id));
create policy "cad_version_metal_weights_update" on public.cad_version_metal_weights for update
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_metal_weights.cad_version_id))
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_metal_weights.cad_version_id));
create policy "cad_version_metal_weights_delete" on public.cad_version_metal_weights for delete
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_metal_weights.cad_version_id));

create policy "cad_version_center_stones_select" on public.cad_version_center_stones for select
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_center_stones.cad_version_id));
create policy "cad_version_center_stones_insert" on public.cad_version_center_stones for insert
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_center_stones.cad_version_id));
create policy "cad_version_center_stones_update" on public.cad_version_center_stones for update
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_center_stones.cad_version_id))
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_center_stones.cad_version_id));
create policy "cad_version_center_stones_delete" on public.cad_version_center_stones for delete
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_center_stones.cad_version_id));

create policy "cad_version_accent_stones_select" on public.cad_version_accent_stones for select
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_accent_stones.cad_version_id));
create policy "cad_version_accent_stones_insert" on public.cad_version_accent_stones for insert
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_accent_stones.cad_version_id));
create policy "cad_version_accent_stones_update" on public.cad_version_accent_stones for update
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_accent_stones.cad_version_id))
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_accent_stones.cad_version_id));
create policy "cad_version_accent_stones_delete" on public.cad_version_accent_stones for delete
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_accent_stones.cad_version_id));

create policy "cad_version_quote_lines_select" on public.cad_version_quote_lines for select
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_quote_lines.cad_version_id));
create policy "cad_version_quote_lines_insert" on public.cad_version_quote_lines for insert
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_quote_lines.cad_version_id));
create policy "cad_version_quote_lines_update" on public.cad_version_quote_lines for update
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_quote_lines.cad_version_id))
with check (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_quote_lines.cad_version_id));
create policy "cad_version_quote_lines_delete" on public.cad_version_quote_lines for delete
using (exists (select 1 from public.cad_versions cv join public.orders o on o.id = cv.order_id where cv.id = cad_version_quote_lines.cad_version_id));

-- ════════════════════════════════════════════════════════════════
-- order_attachments — direct parent on orders.
-- ════════════════════════════════════════════════════════════════

create policy "order_attachments_select" on public.order_attachments for select
using (exists (select 1 from public.orders where public.orders.id = order_attachments.order_id));
create policy "order_attachments_insert" on public.order_attachments for insert
with check (exists (select 1 from public.orders where public.orders.id = order_attachments.order_id));
create policy "order_attachments_update" on public.order_attachments for update
using (exists (select 1 from public.orders where public.orders.id = order_attachments.order_id))
with check (exists (select 1 from public.orders where public.orders.id = order_attachments.order_id));
create policy "order_attachments_delete" on public.order_attachments for delete
using (exists (select 1 from public.orders where public.orders.id = order_attachments.order_id));

-- ════════════════════════════════════════════════════════════════
-- order_messages — direct parent on orders. Standard 4 policies.
-- ════════════════════════════════════════════════════════════════

create policy "order_messages_select" on public.order_messages for select
using (exists (select 1 from public.orders where public.orders.id = order_messages.order_id));
create policy "order_messages_insert" on public.order_messages for insert
with check (exists (select 1 from public.orders where public.orders.id = order_messages.order_id));
create policy "order_messages_update" on public.order_messages for update
using (exists (select 1 from public.orders where public.orders.id = order_messages.order_id))
with check (exists (select 1 from public.orders where public.orders.id = order_messages.order_id));
create policy "order_messages_delete" on public.order_messages for delete
using (exists (select 1 from public.orders where public.orders.id = order_messages.order_id));

-- ════════════════════════════════════════════════════════════════
-- order_history_events — append-only audit log.
-- SELECT: parent-order inheritance.
-- INSERT: blocked at the policy layer. Future SECURITY DEFINER helpers will
--         write entries. Service_role can also write directly.
-- No UPDATE / DELETE policies → blocked for authenticated.
-- ════════════════════════════════════════════════════════════════

create policy "order_history_events_select" on public.order_history_events for select
using (exists (select 1 from public.orders where public.orders.id = order_history_events.order_id));

create policy "order_history_events_no_direct_insert" on public.order_history_events for insert
with check (false);
