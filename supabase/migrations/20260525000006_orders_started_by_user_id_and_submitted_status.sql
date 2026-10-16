-- Phase 2C Sub-session 3 Migration A
--
-- Two changes to support the new ownership model + RLS policies in Phase D:
--
-- 1. Add 'submitted' to the order_status enum, between 'draft' and 'designing'.
--    Customer can UPDATE their order while status is in ('draft', 'submitted').
--    Once AM moves it to 'designing', editing is locked (customer can still
--    request modifications via separate flow, but cannot edit fields directly).
--
--    RESERVED FOR PHASE 2D: as of this migration, 'submitted' is a valid enum
--    value but no code path sets it. submitOrder.ts continues to transition
--    orders draft → designing on Submit (skipping 'submitted'), so the
--    customer-editable RLS window today is effectively just status = 'draft'.
--    Phase 2D will update submitOrder.ts to set 'submitted' and add an
--    AM-pickup UI that transitions 'submitted' → 'designing'. The enum value
--    is added now to avoid a future ALTER TYPE + RLS-policy double-migration.
--
-- 2. Add orders.started_by_user_id. Distinct from submitted_by_user_id:
--      started_by = original creator of the draft (immutable after creation)
--      submitted_by = whoever clicked Submit (can differ if creator handed off)
--    In practice today they're the same (the form sets both to hardcodedUser),
--    but the model supports future handoff workflows.
--
-- 3. Backfill: for every existing row with a submitted_by_user_id, copy that
--    value into started_by_user_id. All 34 existing orders have submitted_by_user_id
--    set (Phase A verified), so the backfill populates all 34 — no NULL holes.
--
-- ALTER TYPE ADD VALUE works inside a transaction block in PG12+, but the new
-- value cannot be USED in the same transaction. This migration only ADDS the
-- value — Phase D's RLS migration is where 'submitted' is referenced. ✓ safe.

alter type public.order_status add value if not exists 'submitted' before 'designing';

alter table public.orders
  add column started_by_user_id uuid references public.users(id) on delete set null;

update public.orders
set started_by_user_id = submitted_by_user_id
where started_by_user_id is null and submitted_by_user_id is not null;
