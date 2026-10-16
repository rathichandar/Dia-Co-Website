-- Grant full privileges on the public schema to service_role.
-- Background: this Supabase project was created with "Automatically expose
-- new tables" disabled. That setting suppresses auto-grants for ALL roles,
-- including service_role — so even though service_role bypasses RLS, it
-- still hits "permission denied" at the Postgres GRANT layer.
-- These statements fix that for current and future tables/sequences.
-- GRANT and ALTER DEFAULT PRIVILEGES are idempotent in Postgres.

-- Current objects
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Future objects (anything created later in public auto-grants to service_role)
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
