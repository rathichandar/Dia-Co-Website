-- Phase 2C Sub-session 4 — Migration 16.
--
-- RPC: submit_order(p_order_id uuid)
--
-- Replaces the service-role UPDATE in src/lib/orders/submitOrder.ts.
-- Behavior matches the existing action plus a new history-event insert
-- that wasn't there before (submitOrder.ts never logged this).
--
-- Steps:
--   1. Assert caller can modify this order (assert_can_modify_order →
--      raises 42501 if not).
--   2. Read current status. Fail with sqlstate 02000 if order not found
--      (RLS-filtered or missing), or 22023 if status != 'draft' (the
--      optimistic-lock check; the order was already submitted by another
--      tab or cancelled by an AM).
--   3. UPDATE: status='designing', sub_status='awaiting_design',
--      submitted_by_user_id=auth.uid(), submitted_at=now().
--      Per Sub-session 3 Q7 lock we skip 'submitted' status; Phase 2D
--      wires the AM-pickup flow that uses it.
--   4. INSERT into order_history_events with
--      event_type='order_submitted', actor_side='customer'. The
--      order_history_events INSERT policy is (false) — SECURITY DEFINER
--      bypasses that so the audit trail can be written.
--   5. Return { ok: true, order_number: <text or null> }.
--
-- SECURITY DEFINER + search_path hardened. REVOKE PUBLIC, GRANT
-- authenticated + service_role.

create or replace function public.submit_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id        uuid := auth.uid();
  v_current_status public.order_status;
  v_order_number   text;
begin
  perform public.assert_can_modify_order(p_order_id);

  select status into v_current_status
  from public.orders
  where id = p_order_id;

  if v_current_status is null then
    raise exception 'order not found' using errcode = '02000';
  end if;

  if v_current_status != 'draft'::public.order_status then
    raise exception 'order cannot be submitted: current status is %', v_current_status
      using errcode = '22023';
  end if;

  update public.orders set
    status               = 'designing'::public.order_status,
    sub_status           = 'awaiting_design'::public.order_sub_status,
    submitted_by_user_id = v_user_id,
    submitted_at         = now()
  where id = p_order_id
  returning order_number into v_order_number;

  insert into public.order_history_events (
    order_id,
    event_type,
    actor_side,
    actor_user_id,
    summary,
    is_customer_visible
  ) values (
    p_order_id,
    'order_submitted'::public.history_event_type,
    'customer'::public.actor_side,
    v_user_id,
    'Order submitted',
    true
  );

  return jsonb_build_object(
    'ok', true,
    'order_number', v_order_number
  );
end;
$$;

revoke execute on function public.submit_order(uuid) from public;
grant execute on function public.submit_order(uuid) to authenticated, service_role;
