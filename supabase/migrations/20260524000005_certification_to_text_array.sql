-- ============================================================
-- Migration 25 — Convert order_center_stones.certification to text[]
--
-- Section 05 cert UI is becoming a multi-select checkbox dropdown.
-- Customers can pick more than one cert (e.g., "GIA + IGI" for a
-- diamond that has both reports). One-way schema change: TEXT → TEXT[].
--
-- Safe to convert: pre-check confirmed 2 rows in the table and 0 of
-- them have a non-null certification value. The USING clause is
-- defensive — if somehow a value existed, it gets wrapped into a
-- single-element array so we don't drop customer data.
--
-- The new column type is still nullable. Empty selection persists as
-- NULL (rather than an empty array) — keeps "unspecified" semantics
-- consistent with the rest of the table's nullable text fields.
--
-- Migration 26 (next) will update save_order_center_stones to write
-- an array instead of a single value.
-- ============================================================

alter table order_center_stones
  alter column certification type text[]
  using case
    when certification is null then null
    else array[certification]
  end;

comment on column order_center_stones.certification is
  'Customer-preferred cert providers (multi-select). Options vary by stone type — see form. NULL = unspecified; empty array also normalized to NULL by the save RPC.';
