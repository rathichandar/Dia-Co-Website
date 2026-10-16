-- ============================================================
-- Migration 19 — save_order_metals RPC function
--
-- Atomic whole-section re-serialize for the order_metals child table.
-- Called by src/lib/orders/saveMetals.ts on every Section 04 change.
--
-- Pattern: DELETE all existing rows for the order, INSERT the new set,
-- inside one transaction. If any INSERT fails (e.g., duplicate area
-- violates UNIQUE(order_id, area)), the DELETE rolls back too — the
-- order's metals are never in a torn state.
--
-- Same pattern will be reused for save_order_center_stones and
-- save_order_accent_stones in Phase 2B Step 5.
--
-- Caller passes the metals as a jsonb array. Per-row shape:
--   {
--     "metal_id":      "<uuid>",            -- FK into metals master
--     "area":          "band" | null,
--     "finish":        "high_polish" | ...  -- metal_finish enum, nullable
--     "display_order": 0
--   }
--
-- SECURITY DEFINER so the function runs with the postgres role's
-- privileges, bypassing RLS the same way service_role does today.
-- Explicit search_path prevents privilege escalation via shadowing.
-- ============================================================

create or replace function public.save_order_metals(
  p_order_id uuid,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
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
$$;

comment on function public.save_order_metals(uuid, jsonb) is
  'Whole-section re-serialize for order_metals. Called by saveMetals server action.';

-- Allow service_role (used by saveMetals.ts) to call the function.
-- anon/authenticated are deliberately NOT granted — submission form
-- runs server-side under service_role only until auth + per-user
-- RLS land in Session 13.
grant execute on function public.save_order_metals(uuid, jsonb) to service_role;
