-- Phase 2C Sub-session 3 Migration C
--
-- Add user_profiles.can_manage_order_owners — a 6th capability flag controlling
-- whether a user can add/remove themselves and others from order_owners rows.
-- Customer Admin and Super Admin get it by default; other roles do not.
-- Customer Admin can override this per-user (UPDATE flow, not INSERT trigger).
--
-- Defaults (matches PROJECT_CONTEXT §16 + Sub-session 3 pre-step):
--   sales_rep:       false
--   customer_admin:  true
--   accounting:      false
--   am:              false
--   ar:              false
--   super_admin:     true
--
-- Sequence:
--   1. Add column nullable so the existing 2 rows don't violate NOT NULL.
--   2. Backfill from role.
--   3. Set NOT NULL.
--   4. Replace the BEFORE INSERT defaults trigger function (from migration 31)
--      to include the new column.
--   5. Replace current_user_has_capability() (from migration 32) to recognize
--      'manage_order_owners' as a valid capability name.
--
-- GRANT EXECUTE on both functions persists across CREATE OR REPLACE — Postgres
-- attaches grants to the function object, not the body. So no re-grant needed.

-- 1. Add column (nullable initially).
alter table public.user_profiles
  add column can_manage_order_owners boolean;

-- 2. Backfill the 2 existing rows (Arpit super_admin, Heritage customer_admin
--    both default to true). Defensive ELSE for any roles that arrive later.
update public.user_profiles
set can_manage_order_owners = case role
  when 'sales_rep'::app_role      then false
  when 'customer_admin'::app_role then true
  when 'accounting'::app_role     then false
  when 'am'::app_role             then false
  when 'ar'::app_role             then false
  when 'super_admin'::app_role    then true
end
where can_manage_order_owners is null;

-- 3. Lock the NOT NULL constraint. No static default — the BEFORE INSERT
--    trigger fills it for new rows, mirroring the other 5 capability flags.
alter table public.user_profiles
  alter column can_manage_order_owners set not null;

-- 4. Replace the BEFORE INSERT defaults trigger function to include the new
--    column. Trigger binding is unaffected; CREATE OR REPLACE swaps the body.
create or replace function public.user_profiles_fill_capability_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  case new.role
    when 'sales_rep'::public.app_role then
      new.can_place_orders            := true;
      new.can_view_all_company_orders := true;
      new.can_manage_team             := false;
      new.can_view_invoices           := false;
      new.can_make_payments           := false;
      new.can_manage_order_owners     := false;
    when 'customer_admin'::public.app_role then
      new.can_place_orders            := true;
      new.can_view_all_company_orders := true;
      new.can_manage_team             := true;
      new.can_view_invoices           := true;
      new.can_make_payments           := true;
      new.can_manage_order_owners     := true;
    when 'accounting'::public.app_role then
      new.can_place_orders            := false;
      new.can_view_all_company_orders := false;
      new.can_manage_team             := false;
      new.can_view_invoices           := true;
      new.can_make_payments           := true;
      new.can_manage_order_owners     := false;
    when 'am'::public.app_role then
      new.can_place_orders            := false;
      new.can_view_all_company_orders := false;
      new.can_manage_team             := false;
      new.can_view_invoices           := false;
      new.can_make_payments           := false;
      new.can_manage_order_owners     := false;
    when 'ar'::public.app_role then
      new.can_place_orders            := false;
      new.can_view_all_company_orders := false;
      new.can_manage_team             := false;
      new.can_view_invoices           := true;
      new.can_make_payments           := false;
      new.can_manage_order_owners     := false;
    when 'super_admin'::public.app_role then
      new.can_place_orders            := true;
      new.can_view_all_company_orders := true;
      new.can_manage_team             := true;
      new.can_view_invoices           := true;
      new.can_make_payments           := true;
      new.can_manage_order_owners     := true;
  end case;
  return new;
end;
$$;

-- 5. Replace current_user_has_capability() to recognize 'manage_order_owners'.
--    Other capability names + edge-case handling (unknown name raises, missing
--    profile returns false) carry forward verbatim from migration 32.
create or replace function public.current_user_has_capability(capability_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result boolean;
begin
  case capability_name
    when 'place_orders' then
      select can_place_orders into v_result from public.user_profiles where id = auth.uid();
    when 'view_all_company_orders' then
      select can_view_all_company_orders into v_result from public.user_profiles where id = auth.uid();
    when 'manage_team' then
      select can_manage_team into v_result from public.user_profiles where id = auth.uid();
    when 'view_invoices' then
      select can_view_invoices into v_result from public.user_profiles where id = auth.uid();
    when 'make_payments' then
      select can_make_payments into v_result from public.user_profiles where id = auth.uid();
    when 'manage_order_owners' then
      select can_manage_order_owners into v_result from public.user_profiles where id = auth.uid();
    else
      raise exception 'Unknown capability: %', capability_name
        using errcode = 'invalid_parameter_value';
  end case;
  return coalesce(v_result, false);
end;
$$;
