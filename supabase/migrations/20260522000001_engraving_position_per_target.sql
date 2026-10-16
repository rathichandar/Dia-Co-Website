-- ============================================================
-- Migration 18 — Engraving position per target (logo vs text)
--
-- Replaces orders.engraving_position with two columns:
--   - engraving_logo_position  (where the logo goes, when use_logo=true)
--   - engraving_text_position  (where the engraving text goes, when text is set)
--
-- The old enum values (inside_band | outside_band | other) are also
-- replaced with a product-type-aware set covering the actual positions
-- Dia-Co engraves:
--
--   Ring / Bracelet → inside_shank_top/bottom/left/right
--   Pendant         → back_of_bail, back_of_body
--   Earring / Necklace / Locks / Charm / Cufflinks / Other → back_top/middle/bottom
--   Any product     → other (we'll confirm)
--
-- Display labels live in the form layer, not the DB.
--
-- Data note: no production submissions exist yet. The latest 10 drafts
-- audited at Step 2 ship all had engraving_position = null. The old
-- column is being dropped — any value (none expected) would be lost.
--
-- Validation note (Phase 2B Step 6): submitValidation.ts will enforce
--   engraving_use_logo=true  → engraving_logo_position required
--   engraving_text non-empty → engraving_text_position required
--
-- Idempotent: re-running is a no-op.
-- ============================================================

-- 1. Drop the old column. IF EXISTS handles re-runs.
alter table orders
  drop column if exists engraving_position;

-- 2. Drop the old enum type now that nothing references it.
drop type if exists engraving_position;

-- 3. Create the new enum with the full product-type-aware value set.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'engraving_position') then
    create type engraving_position as enum (
      'inside_shank_top',
      'inside_shank_bottom',
      'inside_shank_left',
      'inside_shank_right',
      'back_of_bail',
      'back_of_body',
      'back_top',
      'back_middle',
      'back_bottom',
      'other'
    );
  end if;
end $$;

-- 4. Add the two new nullable columns.
alter table orders
  add column if not exists engraving_logo_position engraving_position,
  add column if not exists engraving_text_position engraving_position;

comment on column orders.engraving_logo_position is 'Where the customer wants their logo engraved. Valid values depend on product_type; enforced in the form layer.';
comment on column orders.engraving_text_position is 'Where the customer wants engraving text. Valid values depend on product_type; enforced in the form layer.';
