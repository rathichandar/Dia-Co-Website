-- Phase 2C Sub-session 3 — RLS fix migration (4 of 4).
--
-- Bug discovered during Phase E functional matrix: Postgres raises
-- "infinite recursion detected in policy for relation \"orders\"" (SQLSTATE
-- 42P17) on any authenticated SELECT against orders or order_owners. Root
-- cause: the locked policy spec wired a mutual reference between the two
-- tables via inline EXISTS:
--
--   orders SELECT       references order_owners (for the ownership branch)
--   order_owners SELECT references orders       (for customer_id check)
--
-- Postgres' RLS engine traces policy chains and detects the cycle even when
-- short-circuit evaluation would skip the recursive branch at runtime.
-- Service-role bypasses RLS so this didn't surface during catalog checks.
--
-- Fix: introduce two SECURITY DEFINER helpers that read the underlying tables
-- with RLS bypassed, and rewrite the affected policies to call them instead
-- of inline EXISTS. The locked policy SEMANTICS are unchanged — same boolean
-- outcomes for every role × every row — only the implementation mechanism
-- changes. Same hardening pattern as Sub-session 1's auth helpers.
--
-- Policies that need rewiring:
--   orders_select, orders_update, orders_delete  (replace inline EXISTS order_owners with current_user_owns_order)
--   order_owners_select                          (replace inline EXISTS orders with get_order_customer_id)
--
-- Policies verified to NOT need changes:
--   orders_insert                                (doesn't reference order_owners)
--   order_owners_insert, order_owners_delete     (reference orders, but orders SELECT now uses helper → no cycle)
--   child-table policies on order_metals/center/accent (call current_user_can_update_order which is itself SECURITY DEFINER → no cycle)
--
-- current_user_can_update_order also refactored to call the new helper
-- instead of its inline EXISTS on order_owners — pure DRY cleanup, behavior
-- unchanged (the function was already SECURITY DEFINER so no recursion risk,
-- but the helper call is cleaner and shares the same code path).

-- ────────────────────────────────────────────────────────────────
-- Helper 1: current_user_owns_order(uuid)
-- "Is auth.uid() listed in order_owners for this order?"
-- SECURITY DEFINER bypasses order_owners RLS internally, breaking the cycle.
-- ────────────────────────────────────────────────────────────────

create or replace function public.current_user_owns_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.order_owners
    where order_id = p_order_id
      and user_id = auth.uid()
  );
$$;

revoke execute on function public.current_user_owns_order(uuid) from public;
grant execute on function public.current_user_owns_order(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────
-- Helper 2: get_order_customer_id(uuid)
-- "What customer does this order belong to?"
-- SECURITY DEFINER bypasses orders RLS internally, breaking the cycle on the
-- order_owners SELECT side.
-- ────────────────────────────────────────────────────────────────

create or replace function public.get_order_customer_id(p_order_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select customer_id from public.orders where id = p_order_id;
$$;

revoke execute on function public.get_order_customer_id(uuid) from public;
grant execute on function public.get_order_customer_id(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────
-- DRY cleanup: refactor current_user_can_update_order(uuid) to call
-- current_user_owns_order() instead of its inline EXISTS on order_owners.
-- Behavior identical — same SECURITY DEFINER bypass via the helper.
-- GRANTs persist across CREATE OR REPLACE (PG semantics).
-- ────────────────────────────────────────────────────────────────

create or replace function public.current_user_can_update_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when public.current_user_role() in ('am'::public.app_role, 'super_admin'::public.app_role) then true
    when public.is_customer_side() then
      exists (
        select 1 from public.orders o
        where o.id = p_order_id
          and o.customer_id = public.current_user_customer_id()
          and o.status in ('draft'::public.order_status, 'submitted'::public.order_status)
          and (
            public.current_user_has_capability('view_all_company_orders')
            or public.current_user_owns_order(p_order_id)
          )
      )
    else false
  end;
$$;

-- ────────────────────────────────────────────────────────────────
-- orders — drop and recreate SELECT, UPDATE, DELETE policies.
-- INSERT policy doesn't reference order_owners, no change needed.
-- ────────────────────────────────────────────────────────────────

drop policy "orders_select" on public.orders;
create policy "orders_select" on public.orders for select
using (
  (
    public.is_customer_side()
    and customer_id = public.current_user_customer_id()
    and (
      public.current_user_has_capability('view_all_company_orders')
      or public.current_user_owns_order(orders.id)
    )
  )
  or public.current_user_role() in ('am'::public.app_role, 'super_admin'::public.app_role)
  or (
    public.current_user_role() = 'ar'::public.app_role
    and status != 'draft'::public.order_status
  )
);

drop policy "orders_update" on public.orders;
create policy "orders_update" on public.orders for update
using (
  (
    public.is_customer_side()
    and customer_id = public.current_user_customer_id()
    and status in ('draft'::public.order_status, 'submitted'::public.order_status)
    and (
      public.current_user_has_capability('view_all_company_orders')
      or public.current_user_owns_order(orders.id)
    )
  )
  or public.current_user_role() in ('am'::public.app_role, 'super_admin'::public.app_role)
)
with check (
  (
    public.is_customer_side()
    and customer_id = public.current_user_customer_id()
    and status in ('draft'::public.order_status, 'submitted'::public.order_status)
    and (
      public.current_user_has_capability('view_all_company_orders')
      or public.current_user_owns_order(orders.id)
    )
  )
  or public.current_user_role() in ('am'::public.app_role, 'super_admin'::public.app_role)
);

drop policy "orders_delete" on public.orders;
create policy "orders_delete" on public.orders for delete
using (
  (
    public.is_customer_side()
    and customer_id = public.current_user_customer_id()
    and status = 'draft'::public.order_status
    and (
      public.current_user_has_capability('view_all_company_orders')
      or public.current_user_owns_order(orders.id)
    )
  )
  or public.is_super_admin()
);

-- ────────────────────────────────────────────────────────────────
-- order_owners — drop and recreate SELECT policy.
-- INSERT and DELETE policies verified to not recurse (they reference orders,
-- but orders SELECT now uses current_user_owns_order helper → cycle broken).
-- ────────────────────────────────────────────────────────────────

drop policy "order_owners_select" on public.order_owners;
create policy "order_owners_select" on public.order_owners for select
using (
  public.is_diaco_staff()
  or public.get_order_customer_id(order_owners.order_id) = public.current_user_customer_id()
);
