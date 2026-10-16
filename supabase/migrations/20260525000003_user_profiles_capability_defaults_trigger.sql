-- Phase 2C Sub-session 1: capability-flag-defaults trigger on user_profiles.
--
-- BEFORE INSERT trigger that ALWAYS overwrites the 5 capability flag columns from
-- the role value. Seatbelt for non-UI inserts (seeds, scripts, bulk imports) that
-- omit flag values. UI inserts that pass flags explicitly will have those flag
-- values discarded — the source of truth for INSERT-time flag values is this
-- trigger.
--
-- BEFORE INSERT row triggers fire before NOT NULL checks, so assigning
-- NEW.<flag> := ... here satisfies the NOT NULL constraints on the flag columns.
--
-- This trigger applies to INSERT only. UPDATE flows (e.g., Customer Admin's
-- future "manage team" UI) update flags freely.
--
-- Defaults table (canonical, from PROJECT_CONTEXT §16):
--   role           place_orders  view_all_company  manage_team  view_invoices  make_payments
--   sales_rep      true          true              false        false          false
--   customer_admin true          true              true         true           true
--   accounting     false         false             false        true           true
--   am             false         false             false        false          false
--   ar             false         false             false        true           false
--   super_admin    true          true              true         true           true

create or replace function public.user_profiles_fill_capability_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  case new.role
    when 'sales_rep'::public.app_role then
      new.can_place_orders := true;
      new.can_view_all_company_orders := true;
      new.can_manage_team := false;
      new.can_view_invoices := false;
      new.can_make_payments := false;
    when 'customer_admin'::public.app_role then
      new.can_place_orders := true;
      new.can_view_all_company_orders := true;
      new.can_manage_team := true;
      new.can_view_invoices := true;
      new.can_make_payments := true;
    when 'accounting'::public.app_role then
      new.can_place_orders := false;
      new.can_view_all_company_orders := false;
      new.can_manage_team := false;
      new.can_view_invoices := true;
      new.can_make_payments := true;
    when 'am'::public.app_role then
      new.can_place_orders := false;
      new.can_view_all_company_orders := false;
      new.can_manage_team := false;
      new.can_view_invoices := false;
      new.can_make_payments := false;
    when 'ar'::public.app_role then
      new.can_place_orders := false;
      new.can_view_all_company_orders := false;
      new.can_manage_team := false;
      new.can_view_invoices := true;
      new.can_make_payments := false;
    when 'super_admin'::public.app_role then
      new.can_place_orders := true;
      new.can_view_all_company_orders := true;
      new.can_manage_team := true;
      new.can_view_invoices := true;
      new.can_make_payments := true;
  end case;
  return new;
end;
$$;

revoke execute on function public.user_profiles_fill_capability_defaults() from public;

create trigger user_profiles_fill_capability_defaults
before insert on public.user_profiles
for each row
execute function public.user_profiles_fill_capability_defaults();
