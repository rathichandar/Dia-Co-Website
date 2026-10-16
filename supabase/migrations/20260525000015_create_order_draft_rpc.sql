-- Phase 2C Sub-session 4 — Migration 15.
--
-- RPC: create_order_draft(p_payload jsonb)
--
-- Customer-side draft order creation. Replaces the direct
-- orders + order_owners INSERTs from saveDraft.ts. The RPC:
--   1. Extracts and validates customer_id from p_payload.
--   2. Asserts caller belongs to that customer (customer_match).
--   3. Asserts caller has place_orders capability.
--   4. INSERTs the order with started_by_user_id and submitted_by_user_id
--      both = auth.uid(), status = 'draft'.
--   5. INSERTs the creator as the initial order_owners row.
--   6. Returns { id, updated_at } as JSONB.
--
-- AM / super_admin order creation is NOT supported through this RPC —
-- their flow is Phase 2D. This RPC is for customer-side (sales_rep,
-- customer_admin) creating drafts for their own customer.
--
-- SECURITY DEFINER is required:
--   - To bypass the order_owners INSERT policy for the creator-self-owner
--     insert. The locked policy correctly requires customer_admin OR
--     manage_order_owners to add owners, but the *creator* must always
--     become the initial owner regardless of capability — otherwise a
--     sales_rep without manage_order_owners couldn't see the order they
--     just made under the narrow-visibility view_all=false path. The
--     function-level asserts above (customer_match + place_orders) gate
--     this bypass — only callers who already passed those checks reach
--     the INSERT block.
--
-- search_path = public, pg_temp hardened. REVOKE PUBLIC + GRANT
-- authenticated, service_role.
--
-- Column-by-column INSERT (not jsonb_populate_record) so the type casts
-- and the COALESCE-to-defaults behavior are explicit and reviewable.
-- nullif(..., '') normalizes empty strings to NULL — matches the
-- existing saveDraft.ts JS-side semantics (form fields the user left blank).

create or replace function public.create_order_draft(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id  uuid;
  v_user_id      uuid := auth.uid();
  v_new_order_id uuid;
  v_updated_at   timestamptz;
begin
  v_customer_id := nullif(p_payload->>'customer_id', '')::uuid;
  if v_customer_id is null then
    raise exception 'create_order_draft: customer_id is required'
      using errcode = '22023';
  end if;

  -- Customer-match assert. Customer-side users only — diaco staff have
  -- NULL customer_id from current_user_customer_id() so they fail here.
  if public.current_user_customer_id() is null
     or public.current_user_customer_id() != v_customer_id then
    raise exception 'forbidden: customer mismatch'
      using errcode = '42501';
  end if;

  -- Capability assert. Sales reps + customer admins have place_orders=true
  -- by default; super_admin does too but fails the customer-match above;
  -- accounting / am / ar fail here.
  if not public.current_user_has_capability('place_orders') then
    raise exception 'forbidden: missing place_orders capability'
      using errcode = '42501';
  end if;

  insert into public.orders (
    customer_id,
    started_by_user_id,
    submitted_by_user_id,
    status,
    product_type_id,
    client_po,
    end_customer_name,
    quantity,
    size_spec,
    finish_point,
    description,
    submission_notes,
    engraving_text,
    engraving_use_logo,
    engraving_logo_position,
    engraving_text_position,
    shipping_method,
    ship_to_recipient_name,
    ship_to_address_line1,
    ship_to_address_line2,
    ship_to_city,
    ship_to_state,
    ship_to_postal_code,
    ship_to_country,
    ship_to_phone,
    has_center_stones,
    has_accent_stones
  ) values (
    v_customer_id,
    v_user_id,
    v_user_id,
    'draft'::public.order_status,
    nullif(p_payload->>'product_type_id', '')::uuid,
    nullif(p_payload->>'client_po', ''),
    nullif(p_payload->>'end_customer_name', ''),
    coalesce(nullif(p_payload->>'quantity', '')::int, 1),
    nullif(p_payload->>'size_spec', ''),
    nullif(p_payload->>'finish_point', '')::public.finish_point,
    nullif(p_payload->>'description', ''),
    nullif(p_payload->>'submission_notes', ''),
    nullif(p_payload->>'engraving_text', ''),
    coalesce((p_payload->>'engraving_use_logo')::boolean, false),
    nullif(p_payload->>'engraving_logo_position', '')::public.engraving_position,
    nullif(p_payload->>'engraving_text_position', '')::public.engraving_position,
    nullif(p_payload->>'shipping_method', '')::public.shipping_method,
    nullif(p_payload->>'ship_to_recipient_name', ''),
    nullif(p_payload->>'ship_to_address_line1', ''),
    nullif(p_payload->>'ship_to_address_line2', ''),
    nullif(p_payload->>'ship_to_city', ''),
    nullif(p_payload->>'ship_to_state', ''),
    nullif(p_payload->>'ship_to_postal_code', ''),
    coalesce(nullif(p_payload->>'ship_to_country', ''), 'US'),
    nullif(p_payload->>'ship_to_phone', ''),
    nullif(p_payload->>'has_center_stones', '')::public.has_stones,
    nullif(p_payload->>'has_accent_stones', '')::public.has_stones
  )
  returning id, updated_at into v_new_order_id, v_updated_at;

  -- Creator becomes the initial owner. SECURITY DEFINER bypass is
  -- intentional here — see function header comment for rationale.
  insert into public.order_owners (order_id, user_id, added_by_user_id)
  values (v_new_order_id, v_user_id, v_user_id);

  return jsonb_build_object(
    'id', v_new_order_id,
    'updated_at', v_updated_at
  );
end;
$$;

revoke execute on function public.create_order_draft(jsonb) from public;
grant execute on function public.create_order_draft(jsonb) to authenticated, service_role;
