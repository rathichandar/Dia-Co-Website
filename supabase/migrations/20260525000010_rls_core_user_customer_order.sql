-- Phase 2C Sub-session 3 — RLS migration 2 of 3.
--
-- Core data model policies: customers, public.users, user_profiles, order_owners,
-- orders, and the 3 order-spec child tables (metals/center/accent).
--
-- Immutability enforcement: BEFORE UPDATE triggers on orders + user_profiles
-- prevent certain columns from changing. Both triggers early-return when
-- auth.uid() IS NULL (service_role / script contexts) so privileged callers
-- retain full mutation rights. RLS already restricts authenticated callers to
-- their permission scope — the triggers are a hardening layer for cases where
-- WITH CHECK would have to recurse into the same table's SELECT policy.

-- ════════════════════════════════════════════════════════════════
-- GRANTs — give authenticated write access on tables that currently
-- only have SELECT (from migration 14). RLS policies gate row-level.
-- ════════════════════════════════════════════════════════════════

grant insert, update, delete on public.customers           to authenticated;
grant insert, update, delete on public.users               to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
grant insert, update, delete on public.orders              to authenticated;
grant insert, update, delete on public.order_metals        to authenticated;
grant insert, update, delete on public.order_center_stones to authenticated;
grant insert, update, delete on public.order_accent_stones to authenticated;

-- ════════════════════════════════════════════════════════════════
-- customers
-- ════════════════════════════════════════════════════════════════

create policy "customers_select" on public.customers for select
using (
  (public.is_customer_side() and id = public.current_user_customer_id())
  or public.is_diaco_staff()
);

create policy "customers_insert" on public.customers for insert
with check (
  public.current_user_role() in ('am'::public.app_role, 'super_admin'::public.app_role)
);

create policy "customers_update" on public.customers for update
using (
  public.current_user_role() in ('am'::public.app_role, 'ar'::public.app_role, 'super_admin'::public.app_role)
)
with check (
  public.current_user_role() in ('am'::public.app_role, 'ar'::public.app_role, 'super_admin'::public.app_role)
);

create policy "customers_delete" on public.customers for delete
using (public.is_super_admin());

-- ════════════════════════════════════════════════════════════════
-- public.users
-- The "same-customer-via-profile-join" path: a user can see another user
-- if their user_profiles rows share the same customer_id. This lets
-- customer-side teammates see each other.
-- ════════════════════════════════════════════════════════════════

create policy "users_select" on public.users for select
using (
  public.users.id = auth.uid()
  or public.is_diaco_staff()
  or exists (
    select 1
    from public.user_profiles caller, public.user_profiles target
    where caller.id = auth.uid()
      and target.id = public.users.id
      and caller.customer_id is not null
      and caller.customer_id = target.customer_id
  )
);

create policy "users_insert" on public.users for insert
with check (public.is_super_admin());

create policy "users_update" on public.users for update
using (
  public.users.id = auth.uid()
  or public.is_super_admin()
  or (
    public.current_user_role() = 'customer_admin'::public.app_role
    and exists (
      select 1 from public.user_profiles target
      where target.id = public.users.id
        and target.customer_id = public.current_user_customer_id()
    )
  )
)
with check (
  public.users.id = auth.uid()
  or public.is_super_admin()
  or (
    public.current_user_role() = 'customer_admin'::public.app_role
    and exists (
      select 1 from public.user_profiles target
      where target.id = public.users.id
        and target.customer_id = public.current_user_customer_id()
    )
  )
);

create policy "users_delete" on public.users for delete
using (public.is_super_admin());

-- ════════════════════════════════════════════════════════════════
-- user_profiles
-- Sub-session 1 enabled RLS with no policies; this is where we add them.
-- The immutability of id / role / customer_id (under non-super_admin) is
-- enforced by the BEFORE UPDATE trigger below — cleaner than a WITH CHECK
-- self-reference subquery.
-- ════════════════════════════════════════════════════════════════

create policy "user_profiles_select" on public.user_profiles for select
using (
  id = auth.uid()
  or (
    public.current_user_role() = 'customer_admin'::public.app_role
    and customer_id = public.current_user_customer_id()
  )
  or public.is_diaco_staff()
);

create policy "user_profiles_insert" on public.user_profiles for insert
with check (
  public.is_super_admin()
  or (
    public.current_user_role() = 'customer_admin'::public.app_role
    and customer_id = public.current_user_customer_id()
  )
);

create policy "user_profiles_update" on public.user_profiles for update
using (
  id = auth.uid()
  or public.is_super_admin()
  or (
    public.current_user_role() = 'customer_admin'::public.app_role
    and customer_id = public.current_user_customer_id()
  )
)
with check (
  id = auth.uid()
  or public.is_super_admin()
  or (
    public.current_user_role() = 'customer_admin'::public.app_role
    and customer_id = public.current_user_customer_id()
  )
);

create policy "user_profiles_delete" on public.user_profiles for delete
using (public.is_super_admin());

-- Immutability trigger for user_profiles.
-- Early-return on auth.uid() IS NULL lets service_role + script contexts do
-- whatever they need. Authenticated callers can't change id, can't change
-- role / customer_id unless they're super_admin.
create or replace function public.user_profiles_enforce_immutable_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id then
    raise exception 'user_profiles.id is immutable'
      using errcode = 'check_violation';
  end if;
  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'user_profiles.role can only be changed by super_admin'
      using errcode = 'check_violation';
  end if;
  if new.customer_id is distinct from old.customer_id and not public.is_super_admin() then
    raise exception 'user_profiles.customer_id can only be changed by super_admin'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.user_profiles_enforce_immutable_columns() from public;

create trigger user_profiles_enforce_immutable_columns
before update on public.user_profiles
for each row execute function public.user_profiles_enforce_immutable_columns();

-- ════════════════════════════════════════════════════════════════
-- order_owners
-- ════════════════════════════════════════════════════════════════

create policy "order_owners_select" on public.order_owners for select
using (
  public.is_diaco_staff()
  or exists (
    select 1 from public.orders o
    where o.id = order_owners.order_id
      and o.customer_id = public.current_user_customer_id()
  )
);

-- The compound INSERT check:
--   1. Caller must be authorized to add owners (super_admin / am / customer-side
--      with access + capability).
--   2. The user being added must be on the same customer as the order (prevents
--      cross-customer leakage).
create policy "order_owners_insert" on public.order_owners for insert
with check (
  (
    public.is_super_admin()
    or public.current_user_role() = 'am'::public.app_role
    or (
      public.is_customer_side()
      and exists (
        select 1 from public.orders o
        where o.id = order_id
          and o.customer_id = public.current_user_customer_id()
      )
      and (
        public.current_user_role() = 'customer_admin'::public.app_role
        or public.current_user_has_capability('manage_order_owners')
      )
    )
  )
  and exists (
    select 1
    from public.user_profiles up
    join public.orders o on o.id = order_owners.order_id
    where up.id = order_owners.user_id
      and up.customer_id = o.customer_id
  )
);

-- DELETE uses the same auth as INSERT (the first OR-block) — no need to
-- re-validate the cross-customer EXISTS at delete time.
create policy "order_owners_delete" on public.order_owners for delete
using (
  public.is_super_admin()
  or public.current_user_role() = 'am'::public.app_role
  or (
    public.is_customer_side()
    and exists (
      select 1 from public.orders o
      where o.id = order_owners.order_id
        and o.customer_id = public.current_user_customer_id()
    )
    and (
      public.current_user_role() = 'customer_admin'::public.app_role
      or public.current_user_has_capability('manage_order_owners')
    )
  )
);

-- No UPDATE policy: changing ownership = DELETE + INSERT. Without a policy,
-- non-bypass roles can't UPDATE rows. Service_role still can.

-- ════════════════════════════════════════════════════════════════
-- orders — the central policy. Three-way OR across roles:
--   1. customer-side: own customer + (view_all OR is an owner)
--   2. am / super_admin: always
--   3. ar: any non-draft order
-- ════════════════════════════════════════════════════════════════

create policy "orders_select" on public.orders for select
using (
  (
    public.is_customer_side()
    and customer_id = public.current_user_customer_id()
    and (
      public.current_user_has_capability('view_all_company_orders')
      or exists (
        select 1 from public.order_owners
        where order_owners.order_id = orders.id
          and order_owners.user_id = auth.uid()
      )
    )
  )
  or public.current_user_role() in ('am'::public.app_role, 'super_admin'::public.app_role)
  or (
    public.current_user_role() = 'ar'::public.app_role
    and status != 'draft'::public.order_status
  )
);

create policy "orders_insert" on public.orders for insert
with check (
  (
    public.is_customer_side()
    and public.current_user_has_capability('place_orders')
    and customer_id = public.current_user_customer_id()
    and started_by_user_id = auth.uid()
  )
  or (
    public.current_user_role() in ('am'::public.app_role, 'super_admin'::public.app_role)
    and customer_id is not null
    and started_by_user_id = auth.uid()
  )
);

-- UPDATE: customer-side can edit while status IN ('draft','submitted');
-- am/super_admin can edit any status. Immutability of customer_id +
-- started_by_user_id is enforced by the BEFORE UPDATE trigger below.
create policy "orders_update" on public.orders for update
using (
  (
    public.is_customer_side()
    and customer_id = public.current_user_customer_id()
    and status in ('draft'::public.order_status, 'submitted'::public.order_status)
    and (
      public.current_user_has_capability('view_all_company_orders')
      or exists (
        select 1 from public.order_owners
        where order_owners.order_id = orders.id
          and order_owners.user_id = auth.uid()
      )
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
      or exists (
        select 1 from public.order_owners
        where order_owners.order_id = orders.id
          and order_owners.user_id = auth.uid()
      )
    )
  )
  or public.current_user_role() in ('am'::public.app_role, 'super_admin'::public.app_role)
);

create policy "orders_delete" on public.orders for delete
using (
  (
    public.is_customer_side()
    and customer_id = public.current_user_customer_id()
    and status = 'draft'::public.order_status
    and (
      public.current_user_has_capability('view_all_company_orders')
      or exists (
        select 1 from public.order_owners
        where order_owners.order_id = orders.id
          and order_owners.user_id = auth.uid()
      )
    )
  )
  or public.is_super_admin()
);

-- Immutability trigger for orders.
create or replace function public.orders_enforce_immutable_columns()
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
    raise exception 'orders.customer_id is immutable'
      using errcode = 'check_violation';
  end if;
  if new.started_by_user_id is distinct from old.started_by_user_id then
    raise exception 'orders.started_by_user_id is immutable'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.orders_enforce_immutable_columns() from public;

create trigger orders_enforce_immutable_columns
before update on public.orders
for each row execute function public.orders_enforce_immutable_columns();

-- ════════════════════════════════════════════════════════════════
-- current_user_can_update_order(uuid) — helper function used by child-table
-- I/U/D policies. Encapsulates the orders UPDATE policy logic so child tables
-- enforce the same eligibility (status, ownership, role) as the parent.
-- SELECT on child tables stays as simple parent-EXISTS — symmetric visibility
-- for reads is intentional.
--
-- Returns true when:
--   - caller is AM or super_admin (any status, any customer), OR
--   - caller is customer-side AND order belongs to their customer AND status
--     is in ('draft','submitted') AND they either have view_all_company_orders
--     OR appear in order_owners for this order.
-- Returns false for any other role (AR, no role) or unknown order_id.
-- ════════════════════════════════════════════════════════════════

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
            or exists (
              select 1 from public.order_owners
              where order_owners.order_id = o.id
                and order_owners.user_id = auth.uid()
            )
          )
      )
    else false
  end;
$$;

revoke execute on function public.current_user_can_update_order(uuid) from public;
grant execute on function public.current_user_can_update_order(uuid) to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- order_metals, order_center_stones, order_accent_stones
--   SELECT: simple parent-EXISTS — if you can see the order, you see the children.
--   INSERT/UPDATE/DELETE: gated by current_user_can_update_order() — mirrors
--     orders UPDATE eligibility (status, ownership, role), closing the
--     defense-in-depth gap where SELECT visibility != mutation eligibility.
--
-- cad_version_* tables intentionally still use the simple SELECT-visibility
-- pattern for writes — Phase 2B doesn't write to them; Phase 3.0 will when
-- CAD designer migration lands, harden then.
-- ════════════════════════════════════════════════════════════════

create policy "order_metals_select" on public.order_metals for select
using (exists (select 1 from public.orders where public.orders.id = order_metals.order_id));
create policy "order_metals_insert" on public.order_metals for insert
with check (public.current_user_can_update_order(order_metals.order_id));
create policy "order_metals_update" on public.order_metals for update
using (public.current_user_can_update_order(order_metals.order_id))
with check (public.current_user_can_update_order(order_metals.order_id));
create policy "order_metals_delete" on public.order_metals for delete
using (public.current_user_can_update_order(order_metals.order_id));

create policy "order_center_stones_select" on public.order_center_stones for select
using (exists (select 1 from public.orders where public.orders.id = order_center_stones.order_id));
create policy "order_center_stones_insert" on public.order_center_stones for insert
with check (public.current_user_can_update_order(order_center_stones.order_id));
create policy "order_center_stones_update" on public.order_center_stones for update
using (public.current_user_can_update_order(order_center_stones.order_id))
with check (public.current_user_can_update_order(order_center_stones.order_id));
create policy "order_center_stones_delete" on public.order_center_stones for delete
using (public.current_user_can_update_order(order_center_stones.order_id));

create policy "order_accent_stones_select" on public.order_accent_stones for select
using (exists (select 1 from public.orders where public.orders.id = order_accent_stones.order_id));
create policy "order_accent_stones_insert" on public.order_accent_stones for insert
with check (public.current_user_can_update_order(order_accent_stones.order_id));
create policy "order_accent_stones_update" on public.order_accent_stones for update
using (public.current_user_can_update_order(order_accent_stones.order_id))
with check (public.current_user_can_update_order(order_accent_stones.order_id));
create policy "order_accent_stones_delete" on public.order_accent_stones for delete
using (public.current_user_can_update_order(order_accent_stones.order_id));
