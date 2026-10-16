-- Phase 2C Sub-session 1: seed user_profiles rows for Arpit (super_admin) and
-- Heritage Fine Jewelers' Customer Admin (Arpit's dummy personal email).
--
-- This migration runs AFTER scripts/seed-auth-accounts.ts creates the auth.users
-- rows. It looks up each row by lowercased email (Supabase Auth normalizes emails
-- to lowercase at storage time) and inserts the user_profiles row.
--
-- Capability flag columns are omitted — the BEFORE INSERT trigger from migration
-- 20260525000003 fills them based on role.
--
-- If the auth.users rows don't exist yet (script hasn't run), each INSERT
-- selects 0 rows and the migration is a no-op. ON CONFLICT (id) DO NOTHING
-- makes this idempotent on rerun.

insert into public.user_profiles (id, role)
select id, 'super_admin'::public.app_role
from auth.users
where lower(email) = lower('Arpit@diacoglobal.com')
on conflict (id) do nothing;

insert into public.user_profiles (id, role, customer_id)
select id, 'customer_admin'::public.app_role, 'cec99c51-6752-4bd6-88dc-e5bd366d9512'::uuid
from auth.users
where lower(email) = lower('Arbhanderi722@gmail.com')
on conflict (id) do nothing;
