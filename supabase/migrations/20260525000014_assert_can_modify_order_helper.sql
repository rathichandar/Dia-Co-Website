-- Phase 2C Sub-session 4 — Migration 14.
--
-- Helper: assert_can_modify_order(p_order_id uuid)
--   Thin wrapper around current_user_can_update_order() (from Sub-session 3)
--   that raises SQLSTATE 42501 if the caller cannot modify the order.
--
-- Used at the top of every RPC that mutates an order's spec — saveDraft,
-- submitOrder, save_order_metals, save_order_center_stones,
-- save_order_accent_stones — so authorization is enforced in one place and
-- failures surface as a consistent error code that the action layer can
-- translate to a user-facing "forbidden" message.
--
-- SECURITY DEFINER + search_path = public, pg_temp matches the Sub-session 1
-- helper hardening pattern. REVOKE PUBLIC + GRANT to authenticated/service_role.

create or replace function public.assert_can_modify_order(p_order_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_can_update_order(p_order_id) then
    raise exception 'forbidden: caller cannot modify order %', p_order_id
      using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.assert_can_modify_order(uuid) from public;
grant execute on function public.assert_can_modify_order(uuid) to authenticated, service_role;
