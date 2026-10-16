-- Phase 2C Sub-session 5 — File 3 of 3.
--
-- finalize_pending_invite() returns jsonb
--   The invite-acceptance intercept. Runs INSIDE the invitee's newly-
--   authenticated session, invoked from the /reset-password Server Action
--   after auth.updateUser({ password }) succeeds. Determines whether this
--   auth session belongs to an outstanding pending invite; if so, provisions
--   user_profiles + public.users rows and marks the invite accepted. If not,
--   returns a "none" action so the caller knows to treat it as a regular
--   password reset.
--
-- Zero parameters. All state derived from auth.uid() — a caller cannot
-- specify which invite to finalize. This is what makes SECURITY DEFINER
-- safe here.
--
-- SECURITY DEFINER: required. The invitee has no user_profiles row yet, so
--   under SECURITY INVOKER the pending_invites SELECT would be RLS-filtered
--   to zero rows (both customer_admin_select and super_admin_all policies
--   fail with an empty caller profile). DEFINER bypasses RLS for the whole
--   function body. Safe because (a) zero params, (b) auth.uid() null check,
--   (c) all data reads/writes keyed on auth.uid(), (d) revoke public grants.
--
-- set search_path = public, pg_temp: standard hardening against schema
--   hijack.
--
-- Row lookup uniqueness: File 2 tightened the pending_invites partial
--   unique index to (lower(email)) WHERE status='pending', globally scoped.
--   Combined with Supabase auth's one-user-per-email invariant, this means
--   SELECT ... WHERE auth_user_id = auth.uid() AND status='pending' returns
--   at most one row. FOR UPDATE holds a row lock for the whole transaction,
--   coordinated with revoke_pending_invite (SS5 Migration E) which locks
--   the same row.
--
-- Return shapes (jsonb):
--   { "action": "none" }
--       No matching pending_invites row. Regular password reset — JS caller
--       continues its normal redirect.
--   { "action": "accepted", "customer_id": "<uuid>", "role": "<app_role>" }
--       Happy path. user_profiles + public.users rows just inserted;
--       pending_invites status flipped to 'accepted'.
--   { "action": "already_accepted", "customer_id": "<uuid>", "role": "<app_role>" }
--       Idempotency. Row exists with status='accepted' already (repeat call
--       or racy re-invocation). Same data shape as 'accepted' so JS caller
--       can treat them identically without branching to fetch missing data.
--   { "action": "expired" }
--       Row was pending but expires_at <= now(); status flipped to 'expired'.
--       JS caller signs the user out + calls admin.deleteUser.
--   { "action": "revoked" }
--       Row exists with status='revoked'. Defensive branch — reachable only
--       if a revoke landed between callback + this call. JS caller signs
--       the user out.
--
-- State-branch exceptions (JS discriminates via error.message):
--   errcode='P0001', message='not_authenticated'
--     auth.uid() is null — no session. Should be unreachable via authenticated
--     grant, defensive.
--   errcode='P0001', message='unexpected_role'
--     v_invite.role is neither sales_rep nor customer_admin (RLS INSERT
--     policy on pending_invites restricts to these; DB corruption or manual
--     tampering would be the only way to reach this).
--
-- Raw SQLSTATEs may surface from INSERT/UPDATE failures (23505, 23514,
-- 23503, etc.) — treated as generic finalize_failed by the JS layer,
-- rolled back atomically by the surrounding transaction.

create or replace function public.finalize_pending_invite()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid;
  v_invite    public.pending_invites;
  v_email     text;
  v_full_name text;
  v_crr       public.customer_rep_role;
begin
  -- 1. Auth check. Defensive: authenticated grant should prevent anon calls.
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001';
  end if;

  -- 2. Lock + fetch the pending invite for this auth user. FOR UPDATE
  --    coordinates with revoke_pending_invite (Migration E) on the same row.
  select *
    into v_invite
    from public.pending_invites
   where auth_user_id = v_uid
     for update;

  if not found then
    -- No matching invite = regular password reset. No-op.
    return jsonb_build_object('action', 'none');
  end if;

  -- 3. Status branches (early-exit; no side effects).
  if v_invite.status = 'accepted'::public.invite_status then
    return jsonb_build_object(
      'action',      'already_accepted',
      'customer_id', v_invite.customer_id,
      'role',        v_invite.role
    );
  end if;

  if v_invite.status = 'revoked'::public.invite_status then
    return jsonb_build_object('action', 'revoked');
  end if;

  if v_invite.status = 'expired'::public.invite_status then
    return jsonb_build_object('action', 'expired');
  end if;

  -- v_invite.status must be 'pending' at this point. Check expiry.
  if v_invite.expires_at <= now() then
    update public.pending_invites
       set status = 'expired'::public.invite_status
     where id = v_invite.id;
    return jsonb_build_object('action', 'expired');
  end if;

  -- 4. Happy path: pending + not expired.
  --    Read email from auth.users (canonical source; pending_invites.email
  --    was lowercased at createInvite time and Supabase may normalize
  --    differently on the auth side — auth.users is what our public.users
  --    row should mirror).
  select email into v_email from auth.users where id = v_uid;

  -- Concatenate names; both cols NOT NULL per Migration D. trim() cleans up
  -- the leading/trailing space that would result if one side were somehow
  -- blank (createInvite already validates non-empty, defensive).
  v_full_name := trim(v_invite.first_name || ' ' || v_invite.last_name);

  -- Map SS1 app_role → legacy customer_rep_role. pending_invites RLS INSERT
  -- policy restricts role to sales_rep/customer_admin, so unmapped values
  -- indicate DB tampering or corruption.
  v_crr := case v_invite.role
    when 'customer_admin'::public.app_role then 'primary'::public.customer_rep_role
    when 'sales_rep'::public.app_role      then 'additional'::public.customer_rep_role
    else null
  end;

  if v_crr is null then
    raise exception 'unexpected_role'
      using errcode = 'P0001',
            detail  = 'app_role was: ' || v_invite.role::text;
  end if;

  -- 5. INSERT user_profiles. The COALESCE-fill defaults trigger (SS5 File 1)
  --    respects the explicit capability flags we're passing here.
  insert into public.user_profiles (
    id,
    role,
    customer_id,
    can_place_orders,
    can_view_all_company_orders,
    can_manage_team,
    can_manage_order_owners,
    can_view_invoices,
    can_make_payments,
    deactivated_at
  ) values (
    v_uid,
    v_invite.role,
    v_invite.customer_id,
    v_invite.can_place_orders,
    v_invite.can_view_all_company_orders,
    v_invite.can_manage_team,
    v_invite.can_manage_order_owners,
    v_invite.can_view_invoices,
    v_invite.can_make_payments,
    null
  );

  -- 6. INSERT public.users. Legacy user_type + customer_rep_role model;
  --    users_customer_rep_fields_check is satisfied (customer_rep →
  --    customer_id + customer_rep_role both NOT NULL).
  insert into public.users (
    id,
    email,
    user_type,
    customer_id,
    customer_rep_role,
    full_name,
    status,
    invited_by_user_id
  ) values (
    v_uid,
    v_email,
    'customer_rep'::public.user_type,
    v_invite.customer_id,
    v_crr,
    v_full_name,
    'active'::public.user_status,
    v_invite.invited_by_user_id
  );

  -- 7. Mark invite accepted. Last write; if anything above fails, the
  --    surrounding transaction rolls back and the invite stays pending
  --    for the invitee to retry (Server Action layer surfaces error).
  update public.pending_invites
     set status      = 'accepted'::public.invite_status,
         accepted_at = now()
   where id = v_invite.id;

  return jsonb_build_object(
    'action',      'accepted',
    'customer_id', v_invite.customer_id,
    'role',        v_invite.role
  );
end;
$$;

revoke execute on function public.finalize_pending_invite() from public;
grant execute on function public.finalize_pending_invite() to authenticated;
