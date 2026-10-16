-- ============================================================
-- Migration 22 — save_order_center_stones + save_order_accent_stones RPCs
--
-- Two atomic whole-section re-serialize functions, parallel to the
-- save_order_metals RPC from migration 19. Each does DELETE-all-then-
-- INSERT-from-jsonb inside a single implicit plpgsql transaction, so
-- the order's stones rows are never in a torn state.
--
-- Following the migration 19 + 20 template exactly:
--   * SECURITY DEFINER with explicit search_path = public, pg_temp
--   * GRANT EXECUTE to service_role
--   * REVOKE EXECUTE FROM PUBLIC (baked in — lesson from migration 20)
--
-- Caller responsibilities (saveCenterStones.ts / saveAccentStones.ts):
--   * Filter out incomplete rows before sending. Required for each
--     center row: stone_type_id, stone_shape_id, supply_source.
--     Required for each accent row: stone_type_id, supply_source.
--     Partial rows live in client state only — they're not persisted
--     until complete. This matches the saveMetals pattern (rows
--     without metal_id are filtered before send).
--   * display_order = array index (0-based).
--   * Text fields can be empty strings or null; nullif coerces empty
--     to null inside the function.
-- ============================================================

-- ─── Center stones ────────────────────────────────────────────

create or replace function public.save_order_center_stones(
  p_order_id uuid,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Clear existing rows. If INSERT below fails, this rolls back too.
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
      certification
    )
    select
      p_order_id,
      (elem ->> 'display_order')::int,
      (elem ->> 'stone_type_id')::uuid,
      (elem ->> 'stone_shape_id')::uuid,
      (elem ->> 'supply_source')::supply_source,
      nullif(elem ->> 'carat_min', '')::numeric,
      nullif(elem ->> 'carat_max', '')::numeric,
      nullif(trim(elem ->> 'color_min'), ''),
      nullif(trim(elem ->> 'color_max'), ''),
      nullif(trim(elem ->> 'clarity_min'), ''),
      nullif(trim(elem ->> 'clarity_max'), ''),
      nullif(trim(elem ->> 'make_min'), ''),
      nullif(trim(elem ->> 'make_max'), ''),
      nullif(trim(elem ->> 'certification'), '')
    from jsonb_array_elements(p_rows) as elem;
  end if;
end;
$$;

comment on function public.save_order_center_stones(uuid, jsonb) is
  'Whole-section re-serialize for order_center_stones. Called by saveCenterStones server action.';

-- service_role is the only caller (server-side actions). Lock out PUBLIC.
grant execute on function public.save_order_center_stones(uuid, jsonb) to service_role;
revoke execute on function public.save_order_center_stones(uuid, jsonb) from public;

-- ─── Accent stones ────────────────────────────────────────────

create or replace function public.save_order_accent_stones(
  p_order_id uuid,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from order_accent_stones where order_id = p_order_id;

  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    insert into order_accent_stones (
      order_id,
      display_order,
      stone_type_id,
      supply_source
    )
    select
      p_order_id,
      (elem ->> 'display_order')::int,
      (elem ->> 'stone_type_id')::uuid,
      (elem ->> 'supply_source')::supply_source
    from jsonb_array_elements(p_rows) as elem;
  end if;
end;
$$;

comment on function public.save_order_accent_stones(uuid, jsonb) is
  'Whole-section re-serialize for order_accent_stones. Called by saveAccentStones server action.';

grant execute on function public.save_order_accent_stones(uuid, jsonb) to service_role;
revoke execute on function public.save_order_accent_stones(uuid, jsonb) from public;
