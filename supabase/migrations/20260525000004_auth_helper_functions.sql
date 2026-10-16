-- Phase 2C Sub-session 1: auth helper functions.
--
-- 6 functions, all SECURITY DEFINER + set search_path = public, pg_temp + STABLE.
-- All revoke PUBLIC EXECUTE and grant to authenticated and service_role.
--
-- Edge cases handled by every function:
--   (a) auth.uid() returns NULL (no session)
--   (b) user_profiles row missing for auth.uid() (e.g., row deleted but session cached)
--
-- Per spec:
--   - current_user_role(), current_user_customer_id() return NULL on (a) and (b)
--   - is_super_admin(), is_diaco_staff(), is_customer_side() return false on (a) and (b)
--   - current_user_has_capability() returns false on (a) and (b);
--     raises EXCEPTION on unknown capability name

-- 1. current_user_role()
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.user_profiles where id = auth.uid();
$$;

revoke execute on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated, service_role;

-- 2. current_user_customer_id()
create or replace function public.current_user_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select customer_id from public.user_profiles where id = auth.uid();
$$;

revoke execute on function public.current_user_customer_id() from public;
grant execute on function public.current_user_customer_id() to authenticated, service_role;

-- 3. is_super_admin()
--    COALESCE wraps the comparison so a NULL role (no session or missing profile)
--    returns false instead of NULL.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() = 'super_admin'::public.app_role, false);
$$;

revoke execute on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated, service_role;

-- 4. is_diaco_staff()
create or replace function public.is_diaco_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.current_user_role() in (
      'am'::public.app_role,
      'ar'::public.app_role,
      'super_admin'::public.app_role
    ),
    false
  );
$$;

revoke execute on function public.is_diaco_staff() from public;
grant execute on function public.is_diaco_staff() to authenticated, service_role;

-- 5. is_customer_side()
create or replace function public.is_customer_side()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.current_user_role() in (
      'sales_rep'::public.app_role,
      'customer_admin'::public.app_role,
      'accounting'::public.app_role
    ),
    false
  );
$$;

revoke execute on function public.is_customer_side() from public;
grant execute on function public.is_customer_side() to authenticated, service_role;

-- 6. current_user_has_capability(capability_name text)
--    Unknown capability name raises EXCEPTION (don't silently return false — that
--    hides bugs in calling code). No user_profiles row → returns false.
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
    else
      raise exception 'Unknown capability: %', capability_name
        using errcode = 'invalid_parameter_value';
  end case;
  return coalesce(v_result, false);
end;
$$;

revoke execute on function public.current_user_has_capability(text) from public;
grant execute on function public.current_user_has_capability(text) to authenticated, service_role;
