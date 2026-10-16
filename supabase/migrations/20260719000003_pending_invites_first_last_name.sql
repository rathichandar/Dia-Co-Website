-- Phase 2C Sub-session 5 — Migration D of 3.
--
-- Adds first_name + last_name to pending_invites so the Customer Admin can
-- enter the invitee's name at invite-creation time (two-field-always model,
-- locked in the SS5 pre-step). finalizeInvite concatenates these into
-- public.users.full_name (which stays a single column per SCHEMA.md).
--
-- Both columns are NOT NULL with no default and no backfill — pending_invites
-- is a brand-new table with zero rows (verified after Migration A + C ship),
-- so the strict NOT NULL is safe to apply directly.
--
-- Immutability: neither column is in the SS5 immutability trigger's protected
-- set. Names are effectively write-once from the app layer (createInvite is
-- the only INSERT path; no Server Action UPDATEs first_name/last_name), but
-- we don't need trigger-level enforcement — no legitimate flow mutates them
-- post-insert, and if we later want to allow correction before acceptance, a
-- Server Action edit would be fine.

alter table public.pending_invites
  add column first_name text not null,
  add column last_name  text not null;
