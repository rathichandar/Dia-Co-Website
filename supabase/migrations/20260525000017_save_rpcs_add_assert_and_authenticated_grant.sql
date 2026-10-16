-- Phase 2C Sub-session 4 — Migration 17.
--
-- Add assert_can_modify_order() at the top of each existing save_order_*
-- RPC body so cookie-bound clients can call them safely. Add GRANT
-- EXECUTE to authenticated (in addition to the pre-existing service_role
-- grant which CREATE OR REPLACE preserves — see Sub-session 3 fact pattern).
--
-- All other body lines copied verbatim from the existing function
-- definitions (queried via pg_get_functiondef during Phase A inspection).
--
-- Sub-session 4 Phase D swaps each save action's client from service-role
-- → cookie-bound. Under cookie-bound, the RPC runs with auth.uid() set.
-- assert_can_modify_order then enforces eligibility via the same helper
-- the orders UPDATE policy uses (current_user_can_update_order).
--
-- Note: the assert raises before any DELETE happens. So a forbidden caller
-- can't destroy the existing rows then fail on INSERT — the RPC short-
-- circuits at the top.

-- ────────────────────────────────────────────────────────────────
-- save_order_metals
-- ────────────────────────────────────────────────────────────────

create or replace function public.save_order_metals(p_order_id uuid, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  -- Phase 2C Sub-session 4: authorization assert. Raises 42501 if forbidden.
  perform public.assert_can_modify_order(p_order_id);

  -- 1. Clear the existing set. If no rows existed, this is a no-op.
  delete from order_metals where order_id = p_order_id;

  -- 2. Re-insert from the payload. Empty array → INSERT step is a no-op.
  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    insert into order_metals (order_id, metal_id, area, finish, display_order)
    select
      p_order_id,
      (elem ->> 'metal_id')::uuid,
      nullif(trim(elem ->> 'area'), ''),
      nullif(elem ->> 'finish', '')::metal_finish,
      (elem ->> 'display_order')::int
    from jsonb_array_elements(p_rows) as elem;
  end if;
end;
$function$;

grant execute on function public.save_order_metals(uuid, jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- save_order_center_stones
-- ────────────────────────────────────────────────────────────────

create or replace function public.save_order_center_stones(p_order_id uuid, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  -- Phase 2C Sub-session 4: authorization assert. Raises 42501 if forbidden.
  perform public.assert_can_modify_order(p_order_id);

  delete from order_center_stones where order_id = p_order_id;

  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    insert into order_center_stones (
      order_id,
      display_order,
      stone_type_id,
      stone_shape_id,
      supply_source,
      carat_min,
      carat_max,
      color_min,
      color_max,
      clarity_min,
      clarity_max,
      make_min,
      make_max,
      certification,
      length_mm,
      width_mm,
      depth_mm,
      custom_stone_type_name
    )
    select
      p_order_id,
      (elem ->> 'display_order')::int,
      (elem ->> 'stone_type_id')::uuid,
      nullif(elem ->> 'stone_shape_id', '')::uuid,
      (elem ->> 'supply_source')::supply_source,
      nullif(elem ->> 'carat_min', '')::numeric,
      nullif(elem ->> 'carat_max', '')::numeric,
      nullif(trim(elem ->> 'color_min'), ''),
      nullif(trim(elem ->> 'color_max'), ''),
      nullif(trim(elem ->> 'clarity_min'), ''),
      nullif(trim(elem ->> 'clarity_max'), ''),
      nullif(trim(elem ->> 'make_min'), ''),
      nullif(trim(elem ->> 'make_max'), ''),
      -- Certification: JSONB array → text[]. Defensive chained CASE so
      -- the function doesn't raise on legacy/malformed payloads.
      case
        when elem -> 'certification' is null then null
        when jsonb_typeof(elem -> 'certification') <> 'array' then null
        when jsonb_array_length(elem -> 'certification') = 0 then null
        else array(select jsonb_array_elements_text(elem -> 'certification'))
      end,
      nullif(elem ->> 'length_mm', '')::numeric,
      nullif(elem ->> 'width_mm', '')::numeric,
      nullif(elem ->> 'depth_mm', '')::numeric,
      nullif(trim(elem ->> 'custom_stone_type_name'), '')
    from jsonb_array_elements(p_rows) as elem;
  end if;
end;
$function$;

grant execute on function public.save_order_center_stones(uuid, jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- save_order_accent_stones
-- ────────────────────────────────────────────────────────────────

create or replace function public.save_order_accent_stones(p_order_id uuid, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  -- Phase 2C Sub-session 4: authorization assert. Raises 42501 if forbidden.
  perform public.assert_can_modify_order(p_order_id);

  delete from order_accent_stones where order_id = p_order_id;

  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    insert into order_accent_stones (
      order_id,
      display_order,
      stone_type_id,
      supply_source,
      quality_color,
      quality_clarity
    )
    select
      p_order_id,
      (elem ->> 'display_order')::int,
      (elem ->> 'stone_type_id')::uuid,
      (elem ->> 'supply_source')::supply_source,
      nullif(trim(elem ->> 'quality_color'), ''),
      nullif(trim(elem ->> 'quality_clarity'), '')
    from jsonb_array_elements(p_rows) as elem;
  end if;
end;
$function$;

grant execute on function public.save_order_accent_stones(uuid, jsonb) to authenticated;
