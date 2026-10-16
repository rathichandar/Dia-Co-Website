-- ============================================================
-- Migration 28 — save_order_accent_stones v2 (accepts quality)
--
-- Replaces the migration 22 version with one that also persists
-- quality_color + quality_clarity (added in migration 27). The two
-- new fields follow the same forgiving-coercion pattern used for
-- center stones' cert array (migration 26): missing key, JSON null,
-- and empty string all normalize to SQL NULL.
--
-- No value-list validation in the RPC. The UI enforces the tier
-- vocabulary (F/G | H/I | J/K for natural; E/F + VVS auto for lab);
-- the function just persists whatever it's given. Matches migration
-- 26's "trust the form" stance.
--
-- Function shape unchanged otherwise:
--   * Signature:    (p_order_id uuid, p_rows jsonb) returns void
--   * SECURITY DEFINER, search_path = public, pg_temp
--   * GRANT EXECUTE to service_role, REVOKE FROM PUBLIC baked in
--   * Atomic DELETE-then-INSERT inside the implicit plpgsql txn
-- ============================================================

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
$$;

comment on function public.save_order_accent_stones(uuid, jsonb) is
  'Whole-section re-serialize for order_accent_stones. v2 (migration 28): adds quality_color + quality_clarity persistence. Called by saveAccentStones server action.';

-- service_role is the only caller (server-side actions). Lock out PUBLIC.
-- create or replace function preserves prior grants in most cases, but
-- restate them here so the migration is self-contained and idempotent
-- (matches migration 22's pattern, and the §21 rule).
grant execute on function public.save_order_accent_stones(uuid, jsonb) to service_role;
revoke execute on function public.save_order_accent_stones(uuid, jsonb) from public;
