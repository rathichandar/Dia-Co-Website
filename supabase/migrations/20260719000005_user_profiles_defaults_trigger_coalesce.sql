-- Phase 2C Sub-session 5 — File 1 of 3.
--
-- Redefine user_profiles_capability_defaults_trigger from UNCONDITIONAL
-- OVERWRITE to COALESCE-FILL. Every capability-flag assignment inside the
-- role CASE branches now respects an explicit value supplied by the caller;
-- role defaults only fill when the caller omitted the flag (i.e. it arrives
-- as null on NEW).
--
-- Motivation (SS5):
--   finalize_pending_invite (SS5 File 3) needs to INSERT user_profiles rows
--   with capability flag values chosen by the Customer Admin at invite
--   creation time — potentially different from the role's defaults. The
--   original SS1 trigger silently overwrote those values, nullifying the
--   whole "Customer Admin can override defaults per invitee" feature.
--
-- Contract change from SS1:
--   SS1's migration 20260525000003 header said explicitly:
--     "UI inserts that pass flags explicitly will have those flag values
--      discarded — the source of truth for INSERT-time flag values is this
--      trigger."
--   That contract is REVERSED here. New contract:
--     "Explicit flag values supplied on INSERT are respected. Omitted flags
--      (arriving as null on NEW) get filled with the role default."
--   The seatbelt for non-UI inserts (seeds, scripts, bulk imports that omit
--   flags) is preserved — NOT NULL constraints are still satisfied by the
--   COALESCE fills.
--
-- Zero data drift:
--   The two existing seed migrations that INSERT user_profiles rows
--   (20260525000005 for Arpit + Arbhanderi, 20260525000013 for Marcus)
--   BOTH omit every flag column. Under the old overwrite trigger the flags
--   land as role defaults; under this COALESCE trigger they arrive as null,
--   get COALESCEd to the same role defaults, and land as identical values.
--   No data migration needed. No re-run of seeds needed.
--
-- Function shape:
--   Unchanged from migration 20260525000008: same 6-role CASE, same 6 flags
--   per branch, same defaults, same SECURITY DEFINER + search_path hardening.
--   Only the RHS of each assignment changes:
--     was: new.<flag> := <literal>;
--     now: new.<flag> := coalesce(new.<flag>, <literal>);
--
-- Defaults table (unchanged, verified against migration 000008 body +
-- PROJECT_CONTEXT §16, pre-migration verification pass):
--   role           place  view_all  manage_team  view_inv  make_pay  mgmt_owners
--   sales_rep      T      T         F            F         F         F
--   customer_admin T      T         T            T         T         T
--   accounting     F      F         F            T         T         F
--   am             F      F         F            F         F         F
--   ar             F      F         F            T         F         F
--   super_admin    T      T         T            T         T         T
--
-- Grants + trigger binding unchanged. CREATE OR REPLACE swaps the body only.

create or replace function public.user_profiles_fill_capability_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  case new.role
    when 'sales_rep'::public.app_role then
      new.can_place_orders            := coalesce(new.can_place_orders,            true);
      new.can_view_all_company_orders := coalesce(new.can_view_all_company_orders, true);
      new.can_manage_team             := coalesce(new.can_manage_team,             false);
      new.can_view_invoices           := coalesce(new.can_view_invoices,           false);
      new.can_make_payments           := coalesce(new.can_make_payments,           false);
      new.can_manage_order_owners     := coalesce(new.can_manage_order_owners,     false);
    when 'customer_admin'::public.app_role then
      new.can_place_orders            := coalesce(new.can_place_orders,            true);
      new.can_view_all_company_orders := coalesce(new.can_view_all_company_orders, true);
      new.can_manage_team             := coalesce(new.can_manage_team,             true);
      new.can_view_invoices           := coalesce(new.can_view_invoices,           true);
      new.can_make_payments           := coalesce(new.can_make_payments,           true);
      new.can_manage_order_owners     := coalesce(new.can_manage_order_owners,     true);
    when 'accounting'::public.app_role then
      new.can_place_orders            := coalesce(new.can_place_orders,            false);
      new.can_view_all_company_orders := coalesce(new.can_view_all_company_orders, false);
      new.can_manage_team             := coalesce(new.can_manage_team,             false);
      new.can_view_invoices           := coalesce(new.can_view_invoices,           true);
      new.can_make_payments           := coalesce(new.can_make_payments,           true);
      new.can_manage_order_owners     := coalesce(new.can_manage_order_owners,     false);
    when 'am'::public.app_role then
      new.can_place_orders            := coalesce(new.can_place_orders,            false);
      new.can_view_all_company_orders := coalesce(new.can_view_all_company_orders, false);
      new.can_manage_team             := coalesce(new.can_manage_team,             false);
      new.can_view_invoices           := coalesce(new.can_view_invoices,           false);
      new.can_make_payments           := coalesce(new.can_make_payments,           false);
      new.can_manage_order_owners     := coalesce(new.can_manage_order_owners,     false);
    when 'ar'::public.app_role then
      new.can_place_orders            := coalesce(new.can_place_orders,            false);
      new.can_view_all_company_orders := coalesce(new.can_view_all_company_orders, false);
      new.can_manage_team             := coalesce(new.can_manage_team,             false);
      new.can_view_invoices           := coalesce(new.can_view_invoices,           true);
      new.can_make_payments           := coalesce(new.can_make_payments,           false);
      new.can_manage_order_owners     := coalesce(new.can_manage_order_owners,     false);
    when 'super_admin'::public.app_role then
      new.can_place_orders            := coalesce(new.can_place_orders,            true);
      new.can_view_all_company_orders := coalesce(new.can_view_all_company_orders, true);
      new.can_manage_team             := coalesce(new.can_manage_team,             true);
      new.can_view_invoices           := coalesce(new.can_view_invoices,           true);
      new.can_make_payments           := coalesce(new.can_make_payments,           true);
      new.can_manage_order_owners     := coalesce(new.can_manage_order_owners,     true);
  end case;
  return new;
end;
$$;
