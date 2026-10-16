-- ============================================================
-- Migration 27 — Quality columns on order_accent_stones
--
-- Section 06 captures accent diamond quality when Dia-Co supplies:
--   Natural Diamond: Color tier (F/G | H/I | J/K) + Clarity (filtered
--     by Color tier; the form enforces the option list).
--   Lab-Grown Diamond: Color and Clarity are auto-selected to E/F +
--     VVS (single industry-standard tier for lab diamonds at our
--     volume). Auto values persist to the DB so the row is queryable
--     consistently — same shape regardless of how it was filled.
--   Color Stone / Other / customer-supplied rows: no quality.
--
-- Strategy: additive, nullable text columns. No CHECK constraint —
-- the UI is the source of truth for the allowed values, and a CHECK
-- here would couple the schema to the UI's tier vocabulary (which
-- differs from order_center_stones' single-grade vocabulary).
-- ============================================================

alter table order_accent_stones
  add column if not exists quality_color   text,
  add column if not exists quality_clarity text;

comment on column order_accent_stones.quality_color   is 'Customer-requested color (when Dia-Co supplies a diamond). Natural diamond tiers: F/G | H/I | J/K. Lab diamond: auto E/F. NULL = not applicable (color stones, customer-supplied, or no diamond chosen yet).';
comment on column order_accent_stones.quality_clarity is 'Customer-requested clarity (when Dia-Co supplies a diamond). Natural diamond options filtered by quality_color. Lab diamond: auto VVS. NULL = not applicable.';
