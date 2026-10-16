-- Phase 2C Sub-session 3 Migration B
--
-- order_owners join table. Many-to-many between orders and users. The set
-- of (order_id, user_id) rows determines who can see/edit an order under
-- the "narrow visibility" path of the locked RLS design — users with
-- can_view_all_company_orders=false only see orders they own.
--
-- (order_id, user_id) is the natural primary key. The added_at + added_by_user_id
-- columns capture audit info ("who added this user as an owner, and when").
--
-- The FK target for user_id is public.users (not user_profiles) per the locked
-- design. This matches the existing 3-table user model: auth.users.id =
-- public.users.id = public.user_profiles.id share the same uuid for any real user.
--
-- Backfill: every existing order has started_by_user_id (set by Migration A's
-- backfill from submitted_by_user_id). Insert an order_owners row pairing each
-- order with its started_by user. added_by = self (no other actor known for
-- the retroactive insert). All 34 existing orders → 34 order_owners rows.
--
-- RLS is enabled with NO policies in this migration. Phase D's RLS migration
-- writes the policies. Without policies, only service_role and SECURITY DEFINER
-- helpers can read/write — same lockout pattern as user_profiles in Sub-session 1.

create table public.order_owners (
  order_id         uuid not null references public.orders(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  added_at         timestamptz not null default now(),
  added_by_user_id uuid not null references public.users(id) on delete restrict,
  primary key (order_id, user_id)
);

-- Backfill from existing orders. ON CONFLICT is defensive — this migration
-- runs exactly once normally, but rerunning shouldn't fail.
insert into public.order_owners (order_id, user_id, added_at, added_by_user_id)
select id, started_by_user_id, now(), started_by_user_id
from public.orders
where started_by_user_id is not null
on conflict (order_id, user_id) do nothing;

alter table public.order_owners enable row level security;

-- GRANTs to authenticated (mirrors the pattern from migration 14 for other
-- operational tables). RLS will gate actual row visibility; grants gate
-- whether the role can touch the table at all. service_role already has
-- access via migration 13's default privileges.
grant select, insert, update, delete on public.order_owners to authenticated;
