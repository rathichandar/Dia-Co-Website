-- Phase 2C Sub-session 1: user_profiles table.
-- One row per auth.users row; carries role + 5 capability flags + customer_id (customer-side roles only).
--
-- RLS is ENABLED with NO policies in this migration. That intentionally locks the
-- table from authenticated/anon access. Sub-session 2 writes the real policies.
-- Service-role and SECURITY DEFINER helpers bypass RLS and remain functional.

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  customer_id uuid references public.customers(id) on delete restrict,
  can_place_orders boolean not null,
  can_view_all_company_orders boolean not null,
  can_manage_team boolean not null,
  can_view_invoices boolean not null,
  can_make_payments boolean not null,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_role_customer_id_match check (
    (role in ('sales_rep'::public.app_role, 'customer_admin'::public.app_role, 'accounting'::public.app_role) and customer_id is not null)
    or
    (role in ('am'::public.app_role, 'ar'::public.app_role, 'super_admin'::public.app_role) and customer_id is null)
  )
);

-- Reuse the existing set_updated_at() function from migration 8.
create trigger set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
