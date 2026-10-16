-- ============================================================
-- Migration 21 — Range columns on order_center_stones
--
-- The Order Entry form (Section 05) captures GRADE RANGES for
-- diamond center stones: customer says "1.0–1.5 ct, D–F color,
-- VVS1–VS2 clarity, Excellent–Very Good make". The existing schema
-- only had single-value columns, designed for AM-finalized specs.
--
-- Strategy: additive. Add 9 new columns for ranges + certification.
-- Leave the existing single-value columns (carat_each, quality_color,
-- quality_clarity, cut_grade, certification_lab, certification_number,
-- certification_url) untouched — they may be used later for AM-side
-- finalization workflows. DG-10001's seeded row uses them today.
--
-- All new columns are nullable. Form persistence is the source of
-- truth for what the customer asked for. Phase 2B Step 6 validation
-- will require at submit:
--   - stone_type_id + stone_shape_id + supply_source when a row exists
--   - NO ranges/cert are required at submit
-- ============================================================

alter table order_center_stones
  add column if not exists carat_min       numeric(7, 4),
  add column if not exists carat_max       numeric(7, 4),
  add column if not exists color_min       text,
  add column if not exists color_max       text,
  add column if not exists clarity_min     text,
  add column if not exists clarity_max     text,
  add column if not exists make_min        text,
  add column if not exists make_max        text,
  add column if not exists certification   text;

comment on column order_center_stones.carat_min     is 'Customer-stated minimum carat (range). NULL = unspecified.';
comment on column order_center_stones.carat_max     is 'Customer-stated maximum carat (range). NULL = unspecified.';
comment on column order_center_stones.color_min     is 'Customer-stated minimum color grade (range). Diamond-only. D/E/F/G/H/I/J/K/L/M/N+. NULL = unspecified.';
comment on column order_center_stones.color_max     is 'Customer-stated maximum color grade (range). Diamond-only. NULL = unspecified.';
comment on column order_center_stones.clarity_min   is 'Customer-stated minimum clarity grade (range). Diamond-only. FL/IF/VVS1/VVS2/VS1/VS2/SI1/SI2/I1/I2/I3. NULL = unspecified.';
comment on column order_center_stones.clarity_max   is 'Customer-stated maximum clarity grade (range). Diamond-only. NULL = unspecified.';
comment on column order_center_stones.make_min      is 'Customer-stated minimum make grade (range). Diamond-only. Excellent/Very Good/Good/Fair/Poor. NULL = unspecified.';
comment on column order_center_stones.make_max      is 'Customer-stated maximum make grade (range). Diamond-only. NULL = unspecified.';
comment on column order_center_stones.certification is 'Customer-preferred cert provider. Options vary by stone type (see form). NULL = unspecified.';
