-- ============================================================
-- Migration 26 — save_order_center_stones v3 (certification as text[])
--
-- Cert column was converted from text → text[] in migration 25 to
-- support multi-select. This migration CREATE OR REPLACE-s the RPC
-- from migration 24 so it writes the new array shape.
--
-- ONLY meaningfully new piece: how the JSONB array from the form
-- gets cast to text[] for the certification column. Form sends:
--   null               → DB NULL
--   []                 → DB NULL  (empty selection normalized to NULL,
--                                   per migration 25's column comment)
--   ["GIA","IGI"]      → DB text[] {GIA, IGI}
--
-- The cast uses a chained CASE with jsonb_typeof guard so the
-- function doesn't error if the caller ever sends a non-array
-- shape (e.g., the legacy single-string payload). It coerces those
-- to NULL too — defensive, since the type system on the caller
-- side should already enforce the array shape.
--
-- Everything else (signature, SECURITY DEFINER, search_path, every
-- other INSERT column) is identical to migration 24. Re-applies
-- GRANT EXECUTE TO service_role + REVOKE EXECUTE FROM PUBLIC at
-- the bottom — same posture as migrations 20/22/24.
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
$$;

comment on function public.save_order_center_stones(uuid, jsonb) is
  'Whole-section re-serialize for order_center_stones (v3 — certification is text[] from a JSONB array).';

-- Re-apply the locked-down grants.
grant execute on function public.save_order_center_stones(uuid, jsonb) to service_role;
revoke execute on function public.save_order_center_stones(uuid, jsonb) from public;
