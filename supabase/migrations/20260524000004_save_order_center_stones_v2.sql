-- ============================================================
-- Migration 24 — save_order_center_stones expanded (v2)
--
-- Section 05's UI restructure (Type-driven layouts A/B/C/D) means
-- the form now writes 4 additional columns to order_center_stones:
--   - length_mm, width_mm, depth_mm (added in migration 23) —
--     populated only when supply_source = 'customer'
--   - custom_stone_type_name (existing legacy column) —
--     populated only when type = 'Other'
--
-- This migration CREATE OR REPLACE-s the RPC from migration 22 with
-- the expanded INSERT column list. Same SECURITY DEFINER posture and
-- search_path hardening as before.
--
-- CREATE OR REPLACE preserves existing grants by default, but we
-- re-apply GRANT + REVOKE explicitly for clarity and to keep this
-- migration idempotent on fresh databases.
-- ============================================================

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
  delete from order_center_stones where order_id = p_order_id;

  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    insert into order_center_stones (
      order_id,
      display_order,
      stone_type_id,
      stone_shape_id,
      supply_source,
      -- Carat + grade ranges (migration 21)
      carat_min,
      carat_max,
      color_min,
      color_max,
      clarity_min,
      clarity_max,
      make_min,
      make_max,
      certification,
      -- Physical dimensions when customer supplies the stone (migration 23)
      length_mm,
      width_mm,
      depth_mm,
      -- Free-text override when Type = 'Other'
      custom_stone_type_name
    )
    select
      p_order_id,
      (elem ->> 'display_order')::int,
      (elem ->> 'stone_type_id')::uuid,
      -- stone_shape_id nullable; Type='Other' rows skip shape entirely
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
      nullif(trim(elem ->> 'certification'), ''),
      nullif(elem ->> 'length_mm', '')::numeric,
      nullif(elem ->> 'width_mm', '')::numeric,
      nullif(elem ->> 'depth_mm', '')::numeric,
      nullif(trim(elem ->> 'custom_stone_type_name'), '')
    from jsonb_array_elements(p_rows) as elem;
  end if;
end;
$$;

comment on function public.save_order_center_stones(uuid, jsonb) is
  'Whole-section re-serialize for order_center_stones (v2 — expanded with mm dimensions + custom_stone_type_name).';

-- Re-apply the locked-down grants (explicit + idempotent on fresh installs).
grant execute on function public.save_order_center_stones(uuid, jsonb) to service_role;
revoke execute on function public.save_order_center_stones(uuid, jsonb) from public;
