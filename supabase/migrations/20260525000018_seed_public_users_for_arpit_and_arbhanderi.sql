-- Phase 2C Sub-session 4 — Migration 18.
--
-- Backfill public.users rows for Arpit (super_admin) and Arbhanderi
-- (Heritage Customer Admin test account). Sub-session 1 seeded both into
-- auth.users + user_profiles but missed the corresponding public.users
-- rows — same gap class as Marcus's missing user_profiles row that
-- Migration 13 fixed, but in reverse.
--
-- The bug surfaced during Sub-session 4 Phase F local smoke: Arbhanderi's
-- first draft save via the new cookie-bound create_order_draft RPC failed
-- because orders.submitted_by_user_id (and orders.started_by_user_id)
-- reference public.users(id), and Arbhanderi had no public.users row →
-- FK violation.
--
-- Schema invariants enforced by users_customer_rep_fields_check:
--   - user_type = 'customer_rep' → customer_id + customer_rep_role both NOT NULL
--   - user_type ≠ 'customer_rep' → customer_id + customer_rep_role both NULL
--
-- Choices:
--   - Arbhanderi's customer_rep_role = 'primary'. The legacy enum has
--     primary | accounting | additional; none maps cleanly to the new
--     user_profiles.role='customer_admin' concept (the legacy field
--     predates Sub-session 1's role model). 'primary' fits her top-level
--     authority. Marcus is also 'primary' for Heritage — multiple
--     primaries are explicitly allowed per SCHEMA.md §2.
--   - Arbhanderi's full_name = 'Arpit (Heritage Test)'. Accurate — it's
--     Arpit using his personal email to play the Heritage Customer Admin
--     role for testing.
--   - Emails lowercased to match Supabase Auth's storage format.
--
-- ON CONFLICT (id) DO NOTHING keeps this idempotent.

insert into public.users (
  id, email, user_type, full_name, status
)
values (
  'c0fdeac0-ff1f-4e95-8e88-f54dea9ed18d',
  'arpit@diacoglobal.com',
  'super_admin'::public.user_type,
  'Arpit Bhanderi',
  'active'::public.user_status
)
on conflict (id) do nothing;

insert into public.users (
  id, email, user_type, customer_id, customer_rep_role, full_name, status
)
values (
  '98b362cb-08e5-461e-8b77-791ce07e1fd0',
  'arbhanderi722@gmail.com',
  'customer_rep'::public.user_type,
  'cec99c51-6752-4bd6-88dc-e5bd366d9512'::uuid,
  'primary'::public.customer_rep_role,
  'Arpit (Heritage Test)',
  'active'::public.user_status
)
on conflict (id) do nothing;
