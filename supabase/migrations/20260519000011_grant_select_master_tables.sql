-- Postgres-level SELECT grants on master/reference tables.
-- This Supabase project has "Automatically expose new tables" disabled, so
-- table grants must be made explicitly. Without these grants the anon role
-- cannot SELECT even though the RLS policies in the previous migration allow
-- it — RLS narrows access, it does not grant it.
-- GRANT is natively idempotent in Postgres; no IF NOT EXISTS needed.

grant select on public.metals to anon;
grant select on public.metals to authenticated;

grant select on public.stone_types to anon;
grant select on public.stone_types to authenticated;

grant select on public.stone_shapes to anon;
grant select on public.stone_shapes to authenticated;

grant select on public.setting_styles to anon;
grant select on public.setting_styles to authenticated;

grant select on public.product_types to anon;
grant select on public.product_types to authenticated;
