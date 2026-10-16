-- Portal ↔ ERP integration, Step 1 (ERP_INTEGRATION_CONTRACT.md §4.3, §9).
--
-- The ERP (Dia-Co Internal) is the system of record for customers. A customer's FIRST Customer Admin is
-- now invited from the ERP's Customer Master: the ERP's portal-admin Edge Function calls the signed
-- POST /api/erp/invite route, which creates the invitation with the service-role client. This file lets
-- the Portal's tables hold such an invitation, and lets finalizeInvite tell the ERP who just signed up.
--
-- 1. customers become login shells. A row created from the ERP carries the ERP's customer_code and name
--    only; phone and billing address are no longer required (the ERP holds the real record).
-- 2. pending_invites may come from the ERP: no Portal inviter (invited_by_user_id null), and an
--    erp_invite_ref instead -- the reference the ERP issued, sent back to it at sign-up. Every invite has
--    one or the other. The reference is immutable like the other invitation facts.
-- 3. finalize_pending_invite() also returns erp_invite_ref, invited_by_user_id and the names, so the
--    Server Action can confirm the link with the ERP (portal-gateway link.confirm). Its logic is unchanged.
--
-- APPLY on the Portal project only (rnwslatnbcrasjambabt). NEVER on an ERP project.

-- ════════════════════════════════════════════════════════════════
-- 1. customers: login shells
-- ════════════════════════════════════════════════════════════════
alter table public.customers
  alter column phone drop not null,
  alter column billing_address_line1 drop not null,
  alter column billing_city drop not null,
  alter column billing_state drop not null,
  alter column billing_postal_code drop not null;

-- ════════════════════════════════════════════════════════════════
-- 2. pending_invites: invitations from the ERP
-- ════════════════════════════════════════════════════════════════
alter table public.pending_invites alter column invited_by_user_id drop not null;
alter table public.pending_invites add column if not exists erp_invite_ref uuid;
create unique index if not exists pending_invites_erp_invite_ref_key
  on public.pending_invites (erp_invite_ref) where erp_invite_ref is not null;
alter table public.pending_invites drop constraint if exists pending_invites_has_origin;
alter table public.pending_invites add constraint pending_invites_has_origin
  check (invited_by_user_id is not null or erp_invite_ref is not null);

-- The SS5 immutability trigger, with erp_invite_ref added to the protected set. Service-role callers
-- (auth.uid() is null) still pass, as before.
create or replace function public.pending_invites_enforce_immutable_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.customer_id is distinct from old.customer_id then
    raise exception 'pending_invites.customer_id is immutable'
      using errcode = 'check_violation';
  end if;

  if new.email is distinct from old.email then
    raise exception 'pending_invites.email is immutable'
      using errcode = 'check_violation';
  end if;

  if new.role is distinct from old.role then
    raise exception 'pending_invites.role is immutable'
      using errcode = 'check_violation';
  end if;

  if new.invited_by_user_id is distinct from old.invited_by_user_id then
    raise exception 'pending_invites.invited_by_user_id is immutable'
      using errcode = 'check_violation';
  end if;

  if new.erp_invite_ref is distinct from old.erp_invite_ref then
    raise exception 'pending_invites.erp_invite_ref is immutable'
      using errcode = 'check_violation';
  end if;

  if new.can_place_orders is distinct from old.can_place_orders then
    raise exception 'pending_invites.can_place_orders is immutable'
      using errcode = 'check_violation';
  end if;

  if new.can_view_all_company_orders is distinct from old.can_view_all_company_orders then
    raise exception 'pending_invites.can_view_all_company_orders is immutable'
      using errcode = 'check_violation';
  end if;

  if new.can_manage_team is distinct from old.can_manage_team then
    raise exception 'pending_invites.can_manage_team is immutable'
      using errcode = 'check_violation';
  end if;

  if new.can_manage_order_owners is distinct from old.can_manage_order_owners then
    raise exception 'pending_invites.can_manage_order_owners is immutable'
      using errcode = 'check_violation';
  end if;

  if new.can_view_invoices is distinct from old.can_view_invoices then
    raise exception 'pending_invites.can_view_invoices is immutable'
      using errcode = 'check_violation';
  end if;

  if new.can_make_payments is distinct from old.can_make_payments then
    raise exception 'pending_invites.can_make_payments is immutable'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- 3. finalize_pending_invite: same logic, richer answer
-- ════════════════════════════════════════════════════════════════
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
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001';
  end if;

  select *
    into v_invite
    from public.pending_invites
   where auth_user_id = v_uid
     for update;

  if not found then
    return jsonb_build_object('action', 'none');
  end if;

  if v_invite.status = 'accepted'::public.invite_status then
    return jsonb_build_object(
      'action',             'already_accepted',
      'customer_id',        v_invite.customer_id,
      'role',               v_invite.role,
      'erp_invite_ref',     v_invite.erp_invite_ref,
      'invited_by_user_id', v_invite.invited_by_user_id,
      'first_name',         v_invite.first_name,
      'last_name',          v_invite.last_name
    );
  end if;

  if v_invite.status = 'revoked'::public.invite_status then
    return jsonb_build_object('action', 'revoked');
  end if;

  if v_invite.status = 'expired'::public.invite_status then
    return jsonb_build_object('action', 'expired');
  end if;

  if v_invite.expires_at <= now() then
    update public.pending_invites
       set status = 'expired'::public.invite_status
     where id = v_invite.id;
    return jsonb_build_object('action', 'expired');
  end if;

  select email into v_email from auth.users where id = v_uid;

  v_full_name := trim(v_invite.first_name || ' ' || v_invite.last_name);

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

  update public.pending_invites
     set status      = 'accepted'::public.invite_status,
         accepted_at = now()
   where id = v_invite.id;

  return jsonb_build_object(
    'action',             'accepted',
    'customer_id',        v_invite.customer_id,
    'role',               v_invite.role,
    'erp_invite_ref',     v_invite.erp_invite_ref,
    'invited_by_user_id', v_invite.invited_by_user_id,
    'first_name',         v_invite.first_name,
    'last_name',          v_invite.last_name
  );
end;
$$;

revoke execute on function public.finalize_pending_invite() from public;
grant execute on function public.finalize_pending_invite() to authenticated;
