-- Phase 2C Sub-session 4 — Migration 13.
--
-- Backfill Marcus Bennett's user_profiles row. Marcus is the original
-- hardcoded-user UUID (2d07bd8f-...) from Phase 2B. He has rows in
-- auth.users and public.users but Sub-session 1's seed didn't include
-- him in user_profiles — flagged in Sub-session 3 Phase A finding #10.
--
-- Making him a Heritage sales_rep gives him a real role so:
--   - Auth helpers (current_user_role, is_customer_side, etc.) return
--     sensible values when other tests / scripts impersonate him.
--   - The 34 existing seeded orders' submitted_by_user_id = Marcus's UUID
--     stays semantically valid under the new role model.
--
-- Capability flag columns omitted intentionally — Sub-session 1's BEFORE
-- INSERT trigger fills them from the role default (sales_rep gets
-- can_place_orders=true, can_view_all_company_orders=true, others false).
-- Sub-session 3's can_manage_order_owners also auto-fills to false.
--
-- ON CONFLICT (id) DO NOTHING keeps the migration idempotent.

insert into public.user_profiles (id, role, customer_id)
values (
  '2d07bd8f-7850-4d70-acd1-6a2ad4ebd22c',
  'sales_rep'::public.app_role,
  'cec99c51-6752-4bd6-88dc-e5bd366d9512'::uuid
)
on conflict (id) do nothing;
