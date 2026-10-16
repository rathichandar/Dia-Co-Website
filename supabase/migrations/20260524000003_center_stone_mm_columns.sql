-- ============================================================
-- Migration 23 — Customer-supplied stone dimensions
--
-- When the customer says "I'll supply" the center stone, Dia-Co
-- needs the physical dimensions (length / width / depth in mm) to
-- design the setting around it. We don't need grading ranges or
-- cert in that case — the stone is already in hand.
--
-- All three columns nullable. The form only collects them when
-- supply_source = 'customer'. Submit validator (Step 6) will not
-- require them per the brief.
-- ============================================================

alter table order_center_stones
  add column if not exists length_mm numeric(8, 3),
  add column if not exists width_mm  numeric(8, 3),
  add column if not exists depth_mm  numeric(8, 3);

comment on column order_center_stones.length_mm is 'Customer-supplied stone length in mm. Only collected when supply_source=customer.';
comment on column order_center_stones.width_mm  is 'Customer-supplied stone width in mm. Only collected when supply_source=customer.';
comment on column order_center_stones.depth_mm  is 'Customer-supplied stone depth in mm. Only collected when supply_source=customer.';
