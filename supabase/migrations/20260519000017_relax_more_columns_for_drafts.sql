-- Relax orders.product_type_id NOT NULL for the draft state.
--
-- Migration 20260519000016 relaxed finish_point, ship_to_*, order_metals.area,
-- and order_*_stones fields, but missed product_type_id. The new-order form
-- INSERTs a draft row the moment the customer types anything — even a stray
-- character into Client's PO — which happens before they've picked a product
-- type. The FK column being NOT NULL blocked that first insert.
--
-- Once the customer actually submits the order (status moves out of 'draft'),
-- the form layer must enforce that product_type_id is set. That validation
-- moves to the submission path, not the schema.
--
-- Audit of remaining NOT NULL columns on `orders` (run 2026-05-19) confirmed
-- product_type_id is the only one without a default / always-set value at
-- draft time. Everything else either has a sensible default or is reliably
-- set by saveDraft on every insert (customer_id, status).

alter table orders
  alter column product_type_id drop not null;
