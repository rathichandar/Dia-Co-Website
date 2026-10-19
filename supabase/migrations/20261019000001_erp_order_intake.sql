-- ERP integration Step 3 — orders sent to the ERP (ERP_INTEGRATION_CONTRACT.md §6, §11 Portal 2).
--
-- When the ERP is connected, Submit no longer moves an order to 'designing' here: it sends the order to
-- the ERP (gateway op order.submit), where an AM checks it and either creates the real order or declines
-- it with a reason. This migration gives the Portal's own copy what it needs to follow that:
--
--   orders.erp_submission_id   the ERP's receipt for the send (portal_submissions.id there)
--   orders.erp_submitted_at    when it was sent
--   orders.erp_decline_reason  the AM's reason, kept on the draft once the customer reopens a declined order
--   orders.erp_declined_at     when it was declined
--
--   record_erp_submission(p_order_id, p_submission_id)
--     draft -> 'submitted' (the enum value reserved since migration 20260525000006), stamps who and when,
--     keeps the receipt, appends an order_submitted history event. Called by submitOrder ONLY after the ERP
--     answered with a receipt. Sent again for an order already 'submitted' with the same receipt, it answers
--     the same (a retry after a lost reply).
--   reopen_declined_order(p_order_id, p_reason, p_declined_at)
--     'submitted' -> 'draft' after the ERP declined it, keeping the reason for the form's banner. Called by
--     reopenDeclinedOrder ONLY after the gateway confirmed the decline (the Portal never takes the client's
--     word for it).
--
-- Both are SECURITY DEFINER with assert_can_modify_order first, REVOKE PUBLIC, GRANT authenticated +
-- service_role -- the pattern of submit_order (20260525000016).

alter table public.orders
  add column if not exists erp_submission_id  uuid,
  add column if not exists erp_submitted_at   timestamptz,
  add column if not exists erp_decline_reason text,
  add column if not exists erp_declined_at    timestamptz;

comment on column public.orders.erp_submission_id is 'ERP receipt (portal_submissions.id) for the order as sent; null while a draft';
comment on column public.orders.erp_decline_reason is 'The ERP''s reason when it declined this order; shown on the reopened draft';

create or replace function public.record_erp_submission(p_order_id uuid, p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_status  public.order_status;
  v_sid     uuid;
begin
  perform public.assert_can_modify_order(p_order_id);

  if p_submission_id is null then
    raise exception 'record_erp_submission: the ERP receipt is missing' using errcode = '22023';
  end if;

  select status, erp_submission_id into v_status, v_sid from public.orders where id = p_order_id for update;
  if v_status is null then
    raise exception 'order not found' using errcode = '02000';
  end if;

  -- The same send recorded again (a retry after a lost reply): the same answer.
  if v_status = 'submitted'::public.order_status and v_sid = p_submission_id then
    return jsonb_build_object('ok', true, 'noop', true, 'status', 'submitted');
  end if;

  if v_status != 'draft'::public.order_status then
    raise exception 'order cannot be submitted: current status is %', v_status using errcode = '22023';
  end if;

  update public.orders set
    status               = 'submitted'::public.order_status,
    sub_status           = null,
    erp_submission_id    = p_submission_id,
    erp_submitted_at     = now(),
    erp_decline_reason   = null,
    erp_declined_at      = null,
    submitted_by_user_id = v_user_id,
    submitted_at         = now()
  where id = p_order_id;

  insert into public.order_history_events (order_id, event_type, actor_side, actor_user_id, summary, payload, is_customer_visible)
  values (p_order_id, 'order_submitted'::public.history_event_type, 'customer'::public.actor_side, v_user_id,
          'Order sent to Dia-Co', jsonb_build_object('erp_submission_id', p_submission_id), true);

  return jsonb_build_object('ok', true, 'status', 'submitted');
end;
$$;

revoke execute on function public.record_erp_submission(uuid, uuid) from public;
grant execute on function public.record_erp_submission(uuid, uuid) to authenticated, service_role;

create or replace function public.reopen_declined_order(p_order_id uuid, p_reason text, p_declined_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_status  public.order_status;
begin
  perform public.assert_can_modify_order(p_order_id);

  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is null then
    raise exception 'order not found' using errcode = '02000';
  end if;
  if v_status = 'draft'::public.order_status then
    return jsonb_build_object('ok', true, 'noop', true, 'status', 'draft');
  end if;
  if v_status != 'submitted'::public.order_status then
    raise exception 'order cannot be reopened: current status is %', v_status using errcode = '22023';
  end if;

  update public.orders set
    status             = 'draft'::public.order_status,
    sub_status         = null,
    erp_submission_id  = null,
    erp_decline_reason = left(nullif(btrim(coalesce(p_reason, '')), ''), 1000),
    erp_declined_at    = p_declined_at,
    submitted_at       = null
  where id = p_order_id;

  insert into public.order_history_events (order_id, event_type, actor_side, actor_user_id, summary, payload, is_customer_visible)
  values (p_order_id, 'status_changed'::public.history_event_type, 'customer'::public.actor_side, v_user_id,
          'Declined by Dia-Co — reopened to change and send again',
          jsonb_build_object('from', 'submitted', 'to', 'draft', 'declined_at', p_declined_at), true);

  return jsonb_build_object('ok', true, 'status', 'draft');
end;
$$;

revoke execute on function public.reopen_declined_order(uuid, text, timestamptz) from public;
grant execute on function public.reopen_declined_order(uuid, text, timestamptz) to authenticated, service_role;
