-- Phase 2C Sub-session 5 — Migration E.
--
-- revoke_pending_invite(p_invite_id uuid) returns uuid
--   Atomic revoke of a pending invite. Wraps SELECT FOR UPDATE + status
--   validation + UPDATE inside a single Postgres transaction so we cannot
--   race with finalize_pending_invite (which will land in Group 2 with the
--   same FOR UPDATE-on-the-same-row pattern).
--
--   Returns the auth_user_id that was on the row before we cleared it, so
--   the JS caller can pass it to supabase.auth.admin.deleteUser without
--   needing a separate SELECT.
--
-- SECURITY INVOKER: the RPC does NOT bypass RLS. The caller's own SELECT
--   + UPDATE policies on pending_invites gate access. A Customer Admin
--   without can_manage_team, or targeting a different customer, will
--   either see zero rows on the SELECT (→ invite_not_found) or trip a
--   42501 on the UPDATE. This matches the "RLS + capability check in JS,
--   RPC just enforces atomicity" split we locked with Arpit for SS5.
--
-- set search_path = public, pg_temp: defense-in-depth against schema
--   hijack, standard hygiene we apply on all our RPCs / helpers.
--
-- Error codes surfaced to JS:
--   errcode='P0002' (no_data_found), message='invite_not_found'
--     → row not visible to caller (missing, wrong customer, or lacks
--       can_manage_team). Merged with actual "not found" per the
--       don't-leak-existence-across-customers pattern.
--   errcode='P0001' (raise_exception), message='invite_already_accepted'
--     → invitee has accepted; caller should use deactivation instead.
--   errcode='P0001', message='invite_not_pending'
--     → invite is revoked / expired; not actionable.
--   errcode='42501' (insufficient_privilege) may surface on the UPDATE
--     if RLS blocks the write (shouldn't happen if SELECT succeeded, but
--     defensive — JS handles it).

create or replace function public.revoke_pending_invite(p_invite_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_auth_user_id uuid;
  v_status public.invite_status;
begin
  -- Lock the row for the duration of this transaction. Any concurrent
  -- finalize_pending_invite (Group 2) that tries FOR UPDATE on the same
  -- row will block here until we commit; when it wakes it will see our
  -- status='revoked' write and branch to its revoked-invite path.
  select auth_user_id, status
    into v_auth_user_id, v_status
    from public.pending_invites
   where id = p_invite_id
     for update;

  if not found then
    raise exception 'invite_not_found'
      using errcode = 'P0002';
  end if;

  if v_status = 'accepted'::public.invite_status then
    raise exception 'invite_already_accepted'
      using errcode = 'P0001';
  end if;

  if v_status <> 'pending'::public.invite_status then
    raise exception 'invite_not_pending'
      using errcode = 'P0001';
  end if;

  update public.pending_invites
     set status             = 'revoked'::public.invite_status,
         revoked_at         = now(),
         revoked_by_user_id = auth.uid(),
         auth_user_id       = null
   where id = p_invite_id;

  return v_auth_user_id;
end;
$$;

revoke execute on function public.revoke_pending_invite(uuid) from public;
grant execute on function public.revoke_pending_invite(uuid) to authenticated;
