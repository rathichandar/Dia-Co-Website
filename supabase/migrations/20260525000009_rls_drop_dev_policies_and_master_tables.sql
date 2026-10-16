-- Phase 2C Sub-session 3 — RLS migration 1 of 3.
--
-- Two concerns in one file:
--   1. DROP all 21 dev-mode permissive SELECT policies from migrations 10-14.
--      Sub-session 1's user_profiles policies (zero — RLS enabled with no policy)
--      stay untouched; that table gets its real policies in the next file.
--   2. Re-establish master-table policies (5 tables) under the new model.
--      Master tables: SELECT for authenticated only; INSERT/UPDATE/DELETE for
--      super_admin only.
--   3. user_notification_preferences gets a per-user self-access policy.
--
-- GRANT changes:
--   - REVOKE SELECT FROM anon on every operational + master table. Anon was
--     allowed by the dev policies; under the new model, only authenticated +
--     service_role can do anything.
--   - GRANT INSERT/UPDATE/DELETE on master tables to authenticated. Policies
--     gate row-level access; without these grants, even super_admin would hit
--     "permission denied" before RLS kicked in.

-- ────────────────────────────────────────────────────────────────
-- 1. Drop all dev-mode permissive policies (21 total)
-- ────────────────────────────────────────────────────────────────

-- Operational tables (dev_read pattern, from migration 14)
drop policy if exists "customers_dev_read"                     on public.customers;
drop policy if exists "users_dev_read"                         on public.users;
drop policy if exists "user_notification_preferences_dev_read" on public.user_notification_preferences;
drop policy if exists "orders_dev_read"                        on public.orders;
drop policy if exists "order_metals_dev_read"                  on public.order_metals;
drop policy if exists "order_center_stones_dev_read"           on public.order_center_stones;
drop policy if exists "order_accent_stones_dev_read"           on public.order_accent_stones;
drop policy if exists "cad_versions_dev_read"                  on public.cad_versions;
drop policy if exists "cad_version_renders_dev_read"           on public.cad_version_renders;
drop policy if exists "cad_version_metal_weights_dev_read"     on public.cad_version_metal_weights;
drop policy if exists "cad_version_center_stones_dev_read"     on public.cad_version_center_stones;
drop policy if exists "cad_version_accent_stones_dev_read"     on public.cad_version_accent_stones;
drop policy if exists "cad_version_quote_lines_dev_read"       on public.cad_version_quote_lines;
drop policy if exists "order_history_events_dev_read"          on public.order_history_events;
drop policy if exists "order_messages_dev_read"                on public.order_messages;
drop policy if exists "order_attachments_dev_read"             on public.order_attachments;

-- Master tables (public_read pattern, from migrations 10-11)
drop policy if exists "metals_public_read"          on public.metals;
drop policy if exists "stone_types_public_read"     on public.stone_types;
drop policy if exists "stone_shapes_public_read"    on public.stone_shapes;
drop policy if exists "setting_styles_public_read"  on public.setting_styles;
drop policy if exists "product_types_public_read"   on public.product_types;

-- ────────────────────────────────────────────────────────────────
-- 2. REVOKE all access from anon on every operational + master table.
--    Anon should not be able to touch anything under the new model.
--    Authenticated keeps its SELECT grants from migration 14; we'll
--    add INSERT/UPDATE/DELETE grants as needed in this and the next files.
-- ────────────────────────────────────────────────────────────────

revoke all on public.customers                       from anon;
revoke all on public.users                           from anon;
revoke all on public.user_notification_preferences   from anon;
revoke all on public.orders                          from anon;
revoke all on public.order_metals                    from anon;
revoke all on public.order_center_stones             from anon;
revoke all on public.order_accent_stones             from anon;
revoke all on public.cad_versions                    from anon;
revoke all on public.cad_version_renders             from anon;
revoke all on public.cad_version_metal_weights       from anon;
revoke all on public.cad_version_center_stones       from anon;
revoke all on public.cad_version_accent_stones       from anon;
revoke all on public.cad_version_quote_lines         from anon;
revoke all on public.order_history_events            from anon;
revoke all on public.order_messages                  from anon;
revoke all on public.order_attachments               from anon;
revoke all on public.metals                          from anon;
revoke all on public.stone_types                     from anon;
revoke all on public.stone_shapes                    from anon;
revoke all on public.setting_styles                  from anon;
revoke all on public.product_types                   from anon;

-- ────────────────────────────────────────────────────────────────
-- 3. Master tables — real policies.
--    SELECT: any authenticated user can read the masters (form dropdowns
--            need these). auth.role() returns the JWT role claim, which
--            Supabase sets to 'authenticated' for any signed-in user.
--    INSERT/UPDATE/DELETE: super_admin only.
-- ────────────────────────────────────────────────────────────────

-- Per-table grants for write access (super_admin policies will gate row-level).
grant insert, update, delete on public.metals         to authenticated;
grant insert, update, delete on public.stone_types    to authenticated;
grant insert, update, delete on public.stone_shapes   to authenticated;
grant insert, update, delete on public.setting_styles to authenticated;
grant insert, update, delete on public.product_types  to authenticated;

-- metals
create policy "metals_select" on public.metals for select
  using (auth.role() = 'authenticated');
create policy "metals_insert" on public.metals for insert
  with check (public.is_super_admin());
create policy "metals_update" on public.metals for update
  using (public.is_super_admin())
  with check (public.is_super_admin());
create policy "metals_delete" on public.metals for delete
  using (public.is_super_admin());

-- stone_types
create policy "stone_types_select" on public.stone_types for select
  using (auth.role() = 'authenticated');
create policy "stone_types_insert" on public.stone_types for insert
  with check (public.is_super_admin());
create policy "stone_types_update" on public.stone_types for update
  using (public.is_super_admin())
  with check (public.is_super_admin());
create policy "stone_types_delete" on public.stone_types for delete
  using (public.is_super_admin());

-- stone_shapes
create policy "stone_shapes_select" on public.stone_shapes for select
  using (auth.role() = 'authenticated');
create policy "stone_shapes_insert" on public.stone_shapes for insert
  with check (public.is_super_admin());
create policy "stone_shapes_update" on public.stone_shapes for update
  using (public.is_super_admin())
  with check (public.is_super_admin());
create policy "stone_shapes_delete" on public.stone_shapes for delete
  using (public.is_super_admin());

-- setting_styles
create policy "setting_styles_select" on public.setting_styles for select
  using (auth.role() = 'authenticated');
create policy "setting_styles_insert" on public.setting_styles for insert
  with check (public.is_super_admin());
create policy "setting_styles_update" on public.setting_styles for update
  using (public.is_super_admin())
  with check (public.is_super_admin());
create policy "setting_styles_delete" on public.setting_styles for delete
  using (public.is_super_admin());

-- product_types
create policy "product_types_select" on public.product_types for select
  using (auth.role() = 'authenticated');
create policy "product_types_insert" on public.product_types for insert
  with check (public.is_super_admin());
create policy "product_types_update" on public.product_types for update
  using (public.is_super_admin())
  with check (public.is_super_admin());
create policy "product_types_delete" on public.product_types for delete
  using (public.is_super_admin());

-- ────────────────────────────────────────────────────────────────
-- 4. user_notification_preferences — per-user self-access.
--    Each user can see + manage only their own prefs row; super_admin overrides.
-- ────────────────────────────────────────────────────────────────

grant insert, update, delete on public.user_notification_preferences to authenticated;

create policy "user_notification_preferences_select"
  on public.user_notification_preferences for select
  using (user_id = auth.uid() or public.is_super_admin());

create policy "user_notification_preferences_insert"
  on public.user_notification_preferences for insert
  with check (user_id = auth.uid() or public.is_super_admin());

create policy "user_notification_preferences_update"
  on public.user_notification_preferences for update
  using (user_id = auth.uid() or public.is_super_admin())
  with check (user_id = auth.uid() or public.is_super_admin());

create policy "user_notification_preferences_delete"
  on public.user_notification_preferences for delete
  using (user_id = auth.uid() or public.is_super_admin());
