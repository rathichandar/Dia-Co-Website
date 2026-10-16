-- Phase 2C Sub-session 5 — Migration C of 2 (Migration B dropped; reused
-- user_profiles.deactivated_at instead of adding an is_active column).
--
-- Adds RLS policies + BEFORE UPDATE immutability trigger on pending_invites.
--
-- Policy design (4 policies, all permissive → OR'd at evaluation):
--   1. customer_admin SELECT  — same customer + can_manage_team
--   2. customer_admin INSERT  — same customer + can_manage_team + role in
--                               (sales_rep, customer_admin) + invited_by = self
--   3. customer_admin UPDATE  — same customer + can_manage_team
--   4. super_admin ALL        — is_super_admin() (bypasses capability check)
--
-- Column-level restrictions on UPDATE (customer_id, email, role,
-- invited_by_user_id, 6 capability flags never mutate) are enforced by the
-- BEFORE UPDATE trigger below — cleaner than a WITH CHECK subquery, and
-- consistent with the SS3 pattern for orders + user_profiles.
--
-- Service-role callers (server-side scripts, cron, admin utilities) retain
-- full write ability: the trigger early-returns when auth.uid() IS NULL, and
-- service_role bypasses RLS entirely.
--
-- Recursion note: pending_invites policies reference user_profiles ONLY through
-- SECURITY DEFINER helpers (current_user_customer_id, current_user_has_capability,
-- is_super_admin). Definer-rights execution breaks any RLS cycle at the helper
-- boundary. user_profiles policies (SS3) do not reference pending_invites.

-- ════════════════════════════════════════════════════════════════
-- Policy 1 — Customer Admin SELECT
-- ════════════════════════════════════════════════════════════════

create policy "pending_invites_customer_admin_select" on public.pending_invites
for select
using (
  customer_id = public.current_user_customer_id()
  and public.current_user_has_capability('manage_team')
);

-- ════════════════════════════════════════════════════════════════
-- Policy 2 — Customer Admin INSERT
-- Role restricted to sales_rep or customer_admin (no accounting, no Dia-Co
-- side roles). Server Action enforces the same rule; RLS is the DB-level gate.
-- invited_by_user_id = auth.uid() locks attribution to the caller.
-- ════════════════════════════════════════════════════════════════

create policy "pending_invites_customer_admin_insert" on public.pending_invites
for insert
with check (
  customer_id = public.current_user_customer_id()
  and public.current_user_has_capability('manage_team')
  and role in ('sales_rep'::public.app_role, 'customer_admin'::public.app_role)
  and invited_by_user_id = auth.uid()
);

-- ════════════════════════════════════════════════════════════════
-- Policy 3 — Customer Admin UPDATE
-- Row-level scope only. Column immutability lives in the trigger below.
-- ════════════════════════════════════════════════════════════════

create policy "pending_invites_customer_admin_update" on public.pending_invites
for update
using (
  customer_id = public.current_user_customer_id()
  and public.current_user_has_capability('manage_team')
)
with check (
  customer_id = public.current_user_customer_id()
  and public.current_user_has_capability('manage_team')
);

-- ════════════════════════════════════════════════════════════════
-- Policy 4 — Super Admin ALL
-- Applies to SELECT, INSERT, UPDATE, DELETE. Super Admin sits above the
-- capability model and can act on any customer, so no customer_id or
-- capability check.
-- ════════════════════════════════════════════════════════════════

create policy "pending_invites_super_admin_all" on public.pending_invites
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- ════════════════════════════════════════════════════════════════
-- Immutability trigger.
-- Mirrors the SS3 orders_enforce_immutable_columns pattern:
--   - SECURITY DEFINER + set search_path = public, pg_temp
--   - Early return on auth.uid() IS NULL (service_role / scripts unaffected)
--   - IS DISTINCT FROM checks per protected column
--   - RAISE EXCEPTION with errcode='check_violation'
--   - REVOKE EXECUTE FROM PUBLIC
--
-- Protected columns (10): customer_id, email, role, invited_by_user_id,
-- and the 6 capability flag columns.
-- Mutable columns: status, expires_at, accepted_at, revoked_at,
-- revoked_by_user_id, auth_user_id, updated_at.
-- ════════════════════════════════════════════════════════════════

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

revoke execute on function public.pending_invites_enforce_immutable_columns() from public;

create trigger pending_invites_enforce_immutable_columns
before update on public.pending_invites
for each row execute function public.pending_invites_enforce_immutable_columns();
