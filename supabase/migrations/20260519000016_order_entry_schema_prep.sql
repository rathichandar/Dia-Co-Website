-- ============================================================
-- Order Entry form schema prep
--
-- Purpose: make the schema accept the customer-facing submission form's
-- output, including drafts (where many fields aren't filled yet).
--
-- This migration:
--   1. Creates 4 new enums (has_stones, engraving_position,
--      shipping_method, metal_finish)
--   2. Extends 2 existing enums (supply_source += 'mixed';
--      attachment_purpose += 'spec_sheet', 'sketch', 'cad_file')
--   3. Adds 7 new columns to orders + 1 to order_metals
--   4. Relaxes NOT NULL on 10 columns that must accept NULL in draft state
--
-- Idempotent: re-running is a no-op.
-- Does NOT alter or backfill existing rows (DG-10001 keeps all its values).
-- ============================================================

-- ─── 1. New enums (guarded; CREATE TYPE has no IF NOT EXISTS) ────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'has_stones') then
    create type has_stones as enum ('yes', 'no', 'tbd');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'engraving_position') then
    create type engraving_position as enum ('inside_band', 'outside_band', 'other');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'shipping_method') then
    create type shipping_method as enum ('standard', 'different_address', 'drop_ship');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'metal_finish') then
    create type metal_finish as enum (
      'high_polish', 'matte', 'brushed', 'sandblast',
      'hammered', 'satin', 'antiqued'
    );
  end if;
end $$;

-- ─── 2. Extend existing enums ──────────────────────────────────────

-- supply_source currently has (customer, diaco). Form needs a "mixed" value
-- for accent groups where some stones come from the customer and some from us.
alter type supply_source add value if not exists 'mixed';

-- (attachment_purpose intentionally NOT extended — customer form uploads
-- all go in as 'submission_reference'. Content-type classification deferred.)

-- ─── 3. New columns on orders ──────────────────────────────────────

alter table orders
  add column if not exists has_center_stones   has_stones,
  add column if not exists has_accent_stones   has_stones,
  add column if not exists engraving_use_logo  boolean not null default false,
  add column if not exists engraving_position  engraving_position,
  add column if not exists shipping_method     shipping_method,
  add column if not exists ship_to_phone       text,
  add column if not exists submission_notes    text;

comment on column orders.has_center_stones  is 'Tri-state: customer told us at submission whether the piece has a center stone';
comment on column orders.has_accent_stones  is 'Tri-state: customer told us at submission whether the piece has accent stones';
comment on column orders.engraving_use_logo is 'Customer intends to engrave a logo (file may be uploaded as an attachment)';
comment on column orders.engraving_position is 'Where engraving sits — inside band / outside band / other';
comment on column orders.shipping_method    is 'Customer-selected at submission: ship to company / different address / drop ship to end customer';
comment on column orders.ship_to_phone      is 'Recipient phone for shipping address; nullable for the standard case';
comment on column orders.submission_notes   is 'Free-form note to the AM at submission time. Distinct from description (design spec) and history events.';

-- ─── 4. New column on order_metals ─────────────────────────────────

alter table order_metals
  add column if not exists finish metal_finish;

comment on column order_metals.finish is 'Surface treatment for this metal area (high polish, matte, etc.). Distinct from metals.color which is part of the alloy identity.';

-- ─── 5. Relax NOT NULL for draft-friendly state ────────────────────
-- The form saves a draft early in the flow. Many of these fields are not
-- filled until the customer reaches the relevant step.

alter table orders
  alter column finish_point             drop not null,
  alter column ship_to_recipient_name   drop not null,
  alter column ship_to_address_line1    drop not null,
  alter column ship_to_city             drop not null,
  alter column ship_to_state            drop not null,
  alter column ship_to_postal_code      drop not null;

alter table order_metals
  alter column area drop not null;

alter table order_center_stones
  alter column stone_shape_id drop not null;

alter table order_accent_stones
  alter column quantity        drop not null,
  alter column stone_shape_id  drop not null;
