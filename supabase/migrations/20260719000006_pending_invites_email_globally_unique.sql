-- Phase 2C Sub-session 5 — File 2 of 3.
--
-- Tighten the pending_invites strict re-invite semantics from PER-CUSTOMER
-- unique email to GLOBALLY unique email (across all customers).
--
-- Motivation:
--   finalize_pending_invite (SS5 File 3) looks up the invitee's pending
--   invite by auth_user_id = auth.uid(). Supabase's inviteUserByEmail reuses
--   the existing unconfirmed auth.users row when the same email is invited
--   again, so two different customers inviting the same email would land
--   two pending_invites rows sharing one auth_user_id — and finalize would
--   have no deterministic way to pick which invite defines the invitee's
--   role + customer_id + capability flags.
--
--   By making pending emails globally unique, the second inviter gets a
--   23505 unique-violation error at createInvite time. finalize is
--   guaranteed a single row on lookup.
--
-- Trade-off:
--   Legitimate cross-company invites (a sales rep working at two
--   retailers, both trying to onboard them in the same 7-day window)
--   can't run in parallel. The second inviter must wait for the first
--   to accept or revoke. Rare in practice; simplest deterministic
--   guarantee we can offer for now.
--
-- Impact on existing data:
--   pending_invites has 0 rows in production (verified pre-migration).
--   The DROP + CREATE cannot conflict with existing pending invites.
--
-- The 23505 error surface in createInvite.ts stays the same shape but
-- gets a new message (source edit, no DB dependency).

drop index public.pending_invites_email_customer_pending_uniq;

create unique index pending_invites_email_pending_uniq
  on public.pending_invites (lower(email::text))
  where status = 'pending';
