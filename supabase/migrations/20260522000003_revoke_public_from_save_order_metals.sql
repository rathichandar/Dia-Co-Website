-- ============================================================
-- Migration 20 — Revoke PUBLIC from save_order_metals
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default.
-- Migration 19 didn't account for that — its comment claimed
-- anon/authenticated were not granted, but PUBLIC includes them.
--
-- save_order_metals is SECURITY DEFINER and bypasses RLS. Without
-- this revoke, any anon/authenticated caller could overwrite any
-- order's metals by calling supabase.rpc('save_order_metals', ...).
--
-- service_role keeps its explicit grant (set in migration 19) and
-- the postgres owner keeps its implicit grant. Everything else
-- loses access.
--
-- Same gap will be closed proactively in the stones RPC migrations
-- (Phase 2B Step 5) — the REVOKE will be paired with the CREATE.
-- ============================================================

revoke execute on function public.save_order_metals(uuid, jsonb) from public;
