# Dia-Co Portal — Database Schema

> The complete data model for the Dia-Co customer portal. This document is the source of truth for what tables exist, what columns they have, and what relationships connect them. Read this before writing any migration or query.

## Table of contents

**Operational tables**
1. `customers`
2. `users`
3. `user_notification_preferences`
4. `orders`
5. `order_metals`
6. `order_center_stones`
7. `order_accent_stones`
8. `cad_versions`
9. `cad_version_renders`
10. `cad_version_metal_weights`
11. `cad_version_center_stones`
12. `cad_version_accent_stones`
13. `cad_version_quote_lines`
14. `order_history_events`
15. `order_messages`
16. `order_attachments`

**Master / reference tables (synced from software)**
17. `metals`
18. `stone_types`
19. `stone_shapes`
20. `setting_styles`
21. `product_types`

---

## Key architectural patterns

These are the locked decisions that shape the whole schema. Internalize before writing migrations.

1. **Portal owns version history.** Software (existing Dia-Co order management system) overwrites CAD versions and quotes on each delivery. Our portal NEVER overwrites — every CAD sync = new version row appended. Old versions remain forever.

2. **Quote is per-CAD-version, fully snapshotted.** Each `cad_versions` row owns its complete set of inputs (`cad_version_metal_weights`, `cad_version_center_stones`, `cad_version_accent_stones`) AND outputs (`cad_version_quote_lines`). Phase 3 dynamic pricing recalculates from stored inputs without touching live order state.

3. **Multi-rep + internal users supported from day one.** `users` is a single table with `user_type` enum: `customer_rep | am | admin | super_admin`. `customer_id` FK is nullable; required only for `customer_rep`.

4. **Customer code, order number, style number are software-generated.** Synced from existing software. Portal stores copies. `customer_code`, `order_number`, `style_number` are nullable on creation; populated after sync.

5. **No backward CAD approval.** Customer approves only the latest CAD version. To revert to an older design, customer requests a new modification.

6. **Order status is linear with one bidirectional segment.** Top-level: `draft → designing → approved → in_production → qc → shipping`. Plus `on_hold` (resumable) and `cancelled` (terminal). Only `designing` has sub-statuses (`awaiting_design | awaiting_review | redesigning`).

7. **Real-time chat ships in Phase 2.** `order_messages` is a real table powering live customer-AM conversations via Supabase realtime subscriptions.

8. **Two-tone metal is rare.** 95% of orders are single-metal. UI defaults to single; multi is deliberate.

9. **Soft delete only on attachments.** Most tables are append-only (history events, CAD versions, messages). Attachments soft-delete via `deleted_at`.

10. **Stock orders deferred.** The schema is currently custom-only. When stock arrives, revisit (likely add sibling tables, keep `orders` for shared concerns).

---

## Cross-cutting conventions

- All tables use `uuid` primary keys (`gen_random_uuid()` default).
- All tables have `created_at timestamptz not null default now()` and `updated_at timestamptz` (update via trigger or app logic).
- Foreign keys are named `<entity>_id`. Always include `not null` unless explicitly nullable.
- Enum columns use Postgres enums (`CREATE TYPE`). Naming: lowercase snake_case.
- Money stored as `bigint` in cents (e.g., `1749_10` for $1,749.10). Never use floats for money.
- Weights stored as `numeric(N,3)` for grams; carat weights as `numeric(7,4)`.
- Strings default to `text` (Postgres has no perf difference vs varchar).
- Boolean defaults explicit (`default true` or `default false`).
- Timestamps: always `timestamptz` (never `timestamp`).

---

# OPERATIONAL TABLES

## 1. `customers`

Retail jeweler companies that order from Dia-Co. One row per company (NOT per person — people are in `users`).

```
id                      uuid PK
customer_code           text unique             -- "HF10001", software-generated, nullable until synced
name                    text not null           -- "Heritage Fine Jewelers"
tax_id                  text                    -- EIN; sensitive, RLS-restricted
status                  enum not null           -- customer_status: active | inactive | suspended
assigned_am_id          uuid FK → users         -- exactly one AM per customer
credit_limit_cents      bigint                  -- nullable; null = no limit set
net_terms_days          int                     -- nullable; 30, 60, 90, etc.
phone                   text not null
billing_address_line1   text not null
billing_address_line2   text
billing_city            text not null
billing_state           text not null
billing_postal_code     text not null
billing_country         text not null default 'US'
acquisition_source              text                    -- e.g., "referral", "trade show", freeform
referred_by_customer_id         uuid FK → customers
sales_rep_id                    uuid FK → users         -- internal sales contact, distinct from assigned_am_id
account_notes                   text                    -- internal-only notes about the account
default_ship_to_recipient_name  text
default_ship_to_address_line1   text
default_ship_to_address_line2   text
default_ship_to_city            text
default_ship_to_state           text
default_ship_to_postal_code     text
default_ship_to_country         text default 'US'
created_at              timestamptz
updated_at              timestamptz
```

Notes:
- `customer_code` follows format like "HF10001" (2-letter prefix + 5 digits) but software assigns it; portal does not generate.
- `suspended` status is credit-related, not punitive. UI banners show on customer login, but reps can still log in.
- `tax_id` is EIN; treat as sensitive (selective RLS access).
- CHECK constraint `customers_referral_not_self`: `referred_by_customer_id` cannot equal `id` (no self-referrals).
- Outstanding balance NOT tracked (Phase 3 with accounting).

---

## 2. `users`

Everyone who logs in. Customer reps + internal staff (AMs, admins, super admins).

```
id                      uuid PK                 -- matches auth.users.id from Supabase Auth
email                   text unique not null
user_type               enum not null           -- user_type: customer_rep | am | admin | super_admin
customer_id             uuid FK → customers     -- nullable; required when user_type='customer_rep'
customer_rep_role       enum                    -- customer_rep_role: primary | accounting | additional; required when user_type='customer_rep'
full_name               text not null
phone                   text
avatar_url              text                    -- Supabase Storage URL
timezone                text                    -- IANA name, default from billing state at signup
status                  enum not null           -- user_status: active | inactive
invited_by_user_id      uuid FK → users
accepted_terms_at       timestamptz             -- set on signup acceptance
last_login_at           timestamptz
created_at              timestamptz
updated_at              timestamptz
```

Constraints:
- CHECK: `(user_type = 'customer_rep' AND customer_id IS NOT NULL AND customer_rep_role IS NOT NULL) OR (user_type != 'customer_rep' AND customer_id IS NULL AND customer_rep_role IS NULL)`
- NO uniqueness constraint on `(customer_id, customer_rep_role='primary')` — multiple primaries per customer are allowed.

Notes:
- Password handling is delegated to Supabase Auth (`auth.users` table). Our `public.users` row joins via `id`.
- Suspended customer status does NOT block customer_rep users from logging in; UI shows hold banner.
- `avatar_url` is null for customer reps by default; AMs have real avatars uploaded.
- `accepted_terms_at` requires a TOS to be drafted before signup ships (separate concern, not a schema issue).

---

## 3. `user_notification_preferences`

Per-user email notification preferences. One row per user.

```
user_id                       uuid PK FK → users
email_enabled                 boolean default true    -- master kill switch
email_for_cad_ready           boolean default true
email_for_order_approved      boolean default true
email_for_order_shipped       boolean default true
email_for_ship_date_changed   boolean default true
email_for_quote_expiring      boolean default true
email_for_invoice_created     boolean default true
email_for_payment_due_soon    boolean default true
email_for_payment_overdue     boolean default true
email_for_payment_received    boolean default true
email_for_am_message          boolean default true
email_for_order_updates       boolean default true
created_at                    timestamptz
updated_at                    timestamptz
```

Notes:
- SMS deferred (Dia-Co does not currently send SMS).
- In-app notifications are a separate design concern in Phase 2; columns will be added when that table (`in_app_notifications`) is designed.
- Send logic: `email_enabled = true AND email_for_<event> = true`.

---

## 4. `orders`

One row per piece of jewelry. **One order = one design.** Quantity > 1 means N identical pieces of the same design.

```
id                            uuid PK
order_number                  text unique             -- "DG-10001", software-generated, nullable until submission
style_number                  text                    -- "200001-R", software-generated, nullable until submission
client_po                     text                    -- customer-provided freeform
end_customer_name             text                    -- customer-provided freeform

customer_id                   uuid FK → customers not null
submitted_by_user_id          uuid FK → users         -- nullable until first submitted

product_type_id               uuid FK → product_types not null
description                   text                    -- free-text spec from customer

finish_point                  enum not null           -- finish_point: file | wax | raw_casting | polished_mounting | finished_piece
size_spec                     text                    -- "6.5" for rings, "7 inches" for bracelets; NULL for sizeless types
quantity                      int not null default 1
engraving_text                text                    -- nullable
engraving_logo_url            text                    -- Supabase Storage URL, nullable

status                        enum not null           -- order_status: draft | designing | approved | in_production | qc | shipping | on_hold | cancelled
sub_status                    enum                    -- order_sub_status: awaiting_design | awaiting_review | redesigning; required only when status='designing'

priority_rush                 boolean default false
priority_rush_fee_cents       bigint                  -- nullable; per-order variable
priority_rush_status          enum                    -- priority_rush_status: not_requested | requested | approved_by_am | denied

on_hold_reason                text                    -- nullable
on_hold_since                 timestamptz             -- nullable
prior_status                  enum                    -- nullable; stores status to resume to when on_hold lifts

set_id                        uuid                    -- nullable; links orders shipped as a set

ship_to_recipient_name        text not null
ship_to_address_line1         text not null
ship_to_address_line2         text
ship_to_city                  text not null
ship_to_state                 text not null
ship_to_postal_code           text not null
ship_to_country               text not null default 'US'
ship_to_insured_value_cents   bigint

customer_requested_due_date   date                    -- customer's "want by" date
expected_ship_date            date                    -- internal estimate; updates as production progresses
assigned_am_id                uuid FK → users         -- per-order AM override; falls back to customers.assigned_am_id

cancelled_at                  timestamptz
cancelled_by_user_id          uuid FK → users
cancelled_reason              text

submitted_at                  timestamptz
approved_at                   timestamptz
shipped_at                    timestamptz             -- collapses ship + deliver (tracking provider doesn't reliably tell us delivered)
created_at                    timestamptz
updated_at                    timestamptz
```

Constraints:
- CHECK: `(status = 'designing' AND sub_status IS NOT NULL) OR (status != 'designing' AND sub_status IS NULL)`
- CHECK: `(on_hold_since IS NOT NULL) = (status = 'on_hold')` (probably; defer if too restrictive)
- CHECK: `quantity >= 1`

Notes:
- Order number generation: software generates on first submit. Drafts have NO order_number until submit.
- `set_id` is a soft concept: orders sharing a UUID are "a set" in the UI; they're independent operationally.
- Different-size variants of the same design = separate orders (not multi-row child).
- Different finish points = separate orders.
- Ship date clock starts on `approved_at`, NOT `submitted_at`.

---

## 5. `order_metals`

Which metals on which order. Customer-chosen specification.

```
id                  uuid PK
order_id            uuid FK → orders not null
metal_id            uuid FK → metals not null
area                text not null                 -- free text: "band", "head", "shank", etc.
display_order       int not null default 0        -- 0 = primary metal
created_at          timestamptz
updated_at          timestamptz
```

Constraints:
- UNIQUE (order_id, area)

Notes:
- 95% of orders have exactly one row here (single-tone).
- Two-tone = 2 rows, three-tone = 3 rows.
- Weight per metal does NOT live here — it lives on `cad_version_metal_weights` (different per CAD version).

---

## 6. `order_center_stones`

Center stone specification(s) on the order. Current customer-stated state.

Two-stone rings can have multiple rows. Quantity > 1 supports matched centers.

```
id                          uuid PK
order_id                    uuid FK → orders not null
display_order               int not null default 0
quantity                    int not null default 1

stone_type_id               uuid FK → stone_types not null
custom_stone_type_name      text                    -- required when stone_type='Other'
stone_shape_id              uuid FK → stone_shapes not null

size_mm                     numeric(6,2)            -- primary dimension (round: diameter; oval: length)
size_mm_secondary           numeric(6,2)            -- non-round shape width
carat_each                  numeric(7,4)
carat_total_weight          numeric(7,4)

quality_color               text                    -- "D/E", "F/G", etc. (diamonds)
quality_clarity             text                    -- "VS1", "VVS1", "AAA", "AA", etc.
cut_grade                   text                    -- reserved; not collected via form yet
quality_description         text                    -- catch-all for colored stones

supply_source               enum not null           -- supply_source: customer | diaco
customer_stone_received_at  timestamptz             -- nullable; when customer's stone arrived
customer_stone_notes        text                    -- nullable; e.g., "Will FedEx Monday"

certification_lab           text                    -- "GIA", "IGI", "AGS"
certification_number        text
certification_url           text                    -- Supabase Storage URL to cert PDF

setting_style_id            uuid FK → setting_styles

created_at                  timestamptz
updated_at                  timestamptz
```

Notes:
- No UNIQUE on order_id (multiple centers allowed for two-stone designs).
- `cut_grade` column exists; not in Phase 2 submission form. Reserved for future customer input.

---

## 7. `order_accent_stones`

Accent stone groups on the order. Each row = one group of identical stones (e.g., "12× 5.3mm oval").

```
id                          uuid PK
order_id                    uuid FK → orders not null
group_label                 text                    -- nullable, e.g., "side stones", "halo"
display_order               int not null default 0

stone_type_id               uuid FK → stone_types not null
custom_stone_type_name      text                    -- required when stone_type='Other'
stone_shape_id              uuid FK → stone_shapes not null

quantity                    int not null

size_mm                     numeric(6,2)
size_mm_secondary           numeric(6,2)
carat_each                  numeric(7,4)
carat_total_weight          numeric(7,4)            -- typically = carat_each * quantity

quality_color               text                    -- typically a range, e.g., "E/F"
quality_clarity             text                    -- typically a range, e.g., "VVS"
quality_description         text

supply_source               enum not null           -- customer | diaco
customer_stone_received_at  timestamptz
customer_stone_notes        text

setting_style_id            uuid FK → setting_styles

created_at                  timestamptz
updated_at                  timestamptz
```

Notes:
- No certification fields (accents not individually certed).
- No cut_grade (accents not cut-graded).
- No prong_count (accent prong counts not customer-specified).
- Customer-supplied accents DO happen — same tracking fields as centers.

---

## 8. `cad_versions`

A CAD version delivered to the customer for review. **Linear, one current at a time.** Versions are append-only.

```
id                              uuid PK
order_id                        uuid FK → orders not null
version_number                  int not null            -- 1, 2, 3...

designer_internal_name          text                    -- NEVER exposed to customer-facing endpoints
delivery_note                   text                    -- shown to customer

three_d_viewer_url              text

delivered_at                    timestamptz not null    -- when made visible to customer
customer_action                 enum                    -- cad_customer_action: approved | modification_requested; NULL if awaiting
customer_action_at              timestamptz
customer_action_by_user_id      uuid FK → users
modification_request_text       text                    -- when customer requested mod

-- Quote-input snapshots (copied from order state at delivery time)
finish_point                    enum not null           -- snapshot
quantity                        int not null            -- snapshot
size_spec                       text                    -- snapshot
engraving_text                  text                    -- snapshot (affects cost: content varies length)
engraving_logo_url              text                    -- snapshot

created_at                      timestamptz
updated_at                      timestamptz
```

Constraints:
- UNIQUE (order_id, version_number)

Notes:
- Only customer-facing versions get rows. Internal designer iterations live in software, not here.
- `designer_internal_name` is text for Phase 2. Will become FK to users (or designers table) in Option D.
- Snapshot columns enable Phase 3 dynamic pricing to recompute any version's quote from its own stored inputs.

---

## 9. `cad_version_renders`

Render images attached to a CAD version. The CAD gallery UI reads from this table.

```
id                          uuid PK
cad_version_id              uuid FK → cad_versions not null
image_url                   text not null           -- Supabase Storage URL
image_role                  enum                    -- render_image_role: hero | setting_map | detail | render
display_order               int not null default 0
file_size_bytes             bigint
mime_type                   text
original_filename           text                    -- from software, e.g., "122694-R-1.jpg"
created_at                  timestamptz
updated_at                  timestamptz
```

Notes:
- Image_role is best-effort hint, not a contract.
- This is SEPARATE from `order_attachments` because renders are first-class structured artifacts, not generic uploads.

---

## 10. `cad_version_metal_weights`

Per-metal weight estimates for a CAD version. Critical for quote calculation.

```
id                  uuid PK
cad_version_id      uuid FK → cad_versions not null
order_metal_id      uuid FK → order_metals not null
weight_grams        numeric(8,3) not null
created_at          timestamptz
updated_at          timestamptz
```

Constraints:
- UNIQUE (cad_version_id, order_metal_id)

Notes:
- Weight in 10kYG-equivalent grams; convert to other metals using `metals.conversion_factor_from_10kyg`.
- Different CAD versions may have different weights (geometry changes).

---

## 11. `cad_version_center_stones`

Snapshot of center stone spec at this CAD version's delivery. Near-copy of `order_center_stones` minus fulfillment fields.

```
id                          uuid PK
cad_version_id              uuid FK → cad_versions not null
display_order               int not null default 0
quantity                    int not null default 1
stone_type_id               uuid FK → stone_types not null
custom_stone_type_name      text
stone_shape_id              uuid FK → stone_shapes not null
size_mm                     numeric(6,2)
size_mm_secondary           numeric(6,2)
carat_each                  numeric(7,4)
carat_total_weight          numeric(7,4)
quality_color               text
quality_clarity             text
quality_description         text
supply_source               enum not null
setting_style_id            uuid FK → setting_styles
created_at                  timestamptz
updated_at                  timestamptz
```

Excluded vs `order_center_stones`: customer_stone_received_at, customer_stone_notes, certification_*, cut_grade.

Notes:
- Snapshot exists so Phase 3 can recompute v3's quote even if order state has since changed.
- Population: when a CAD version is created, copy `order_center_stones` → `cad_version_center_stones`.

---

## 12. `cad_version_accent_stones`

Snapshot of accent stones spec at this CAD version's delivery. Near-copy of `order_accent_stones`.

```
id                          uuid PK
cad_version_id              uuid FK → cad_versions not null
group_label                 text
display_order               int not null default 0
stone_type_id               uuid FK → stone_types not null
custom_stone_type_name      text
stone_shape_id              uuid FK → stone_shapes not null
quantity                    int not null
size_mm                     numeric(6,2)
size_mm_secondary           numeric(6,2)
carat_each                  numeric(7,4)
carat_total_weight          numeric(7,4)
quality_color               text
quality_clarity             text
quality_description         text
supply_source               enum not null
setting_style_id            uuid FK → setting_styles
created_at                  timestamptz
updated_at                  timestamptz
```

Excluded vs `order_accent_stones`: customer_stone_received_at, customer_stone_notes.

---

## 13. `cad_version_quote_lines`

The quote line items for a CAD version. Frozen at delivery.

```
id                  uuid PK
cad_version_id      uuid FK → cad_versions not null
line_type           enum not null               -- quote_line_type: designing | wax | metal | casting_labor | cleaning_labor | polishing | setting | stones | findings | engraving | shipping | discount | other
description         text not null               -- "14k YG band, 3.45g @ $84.50/g"
quantity            numeric(8,3)                -- grams, stone count, or NULL
unit                text                        -- "g", "stones", "each", or NULL
unit_price_cents    bigint
line_total_cents    bigint not null             -- negative allowed for line_type='discount'
group_label         text                        -- free text for visual grouping ("stones", "setting")
display_order       int not null default 0
created_at          timestamptz
updated_at          timestamptz
```

Notes:
- Priority Rush is NOT a stored quote line. It's a per-order toggle; `computeDisplayedQuote()` adds the $50 line at display time.
- Discount lines have negative `line_total_cents`. Total = `SUM(line_total_cents)`.
- `line_type` ordering reflects production workflow.

---

## 14. `order_history_events`

Structured state-change events. Append-only audit log.

```
id                          uuid PK
order_id                    uuid FK → orders not null
event_type                  enum not null               -- history_event_type: order_submitted | cad_delivered | modification_requested | cad_approved | priority_rush_requested | priority_rush_approved | priority_rush_denied | status_changed | on_hold | resumed | cancelled | shipped | internal_note
actor_side                  enum not null               -- actor_side: customer | diaco | system
actor_user_id               uuid FK → users
actor_display_name          text                        -- snapshot of actor name at event time
summary                     text                        -- short description
payload                     jsonb                       -- structured metadata (varies by event_type)
related_cad_version_id      uuid FK → cad_versions
is_customer_visible         boolean default true
created_at                  timestamptz not null
updated_at                  timestamptz
```

Notes:
- Append-only. No edits, no deletes. Corrections happen via new events.
- `payload` examples:
  - `cad_delivered`: `{version_number: 3}`
  - `modification_requested`: `{request_text: "...", attachment_ids: ["uuid", ...]}`
  - `status_changed`: `{from: "designing", to: "approved"}`
- `actor_display_name` preserves history if a user is later renamed or deactivated.
- `internal_note` event_type is for AM/admin notes with `is_customer_visible=false`.

---

## 15. `order_messages`

Real-time chat between customer reps and AM. Separate from history events because conversation has different lifecycle and growth patterns.

```
id                  uuid PK
order_id            uuid FK → orders not null
sender_user_id      uuid FK → users not null
sender_side         enum not null               -- message_sender_side: customer | diaco
body                text not null
read_by             jsonb default '[]'          -- array of {user_id, read_at} objects
edited_at           timestamptz                 -- nullable
created_at          timestamptz not null
updated_at          timestamptz
```

Notes:
- Real-time delivery via Supabase realtime subscriptions on inserts.
- Phase 2 ships: send, receive, mark read. Defers: typing indicators, message attachments, reactions.
- UI merges history events + messages into one chronological thread for display.

---

## 16. `order_attachments`

All files attached to an order EXCEPT CAD renders (which have their own table).

```
id                          uuid PK
order_id                    uuid FK → orders not null
purpose                     enum not null               -- attachment_purpose: submission_reference | engraving_logo | customer_stone_photo | customer_stone_cert | modification_reference | quote_pdf | final_video | shipping_label | invoice | internal_note_attachment | other
source                      enum not null               -- attachment_source: customer | diaco | system
uploaded_by_user_id         uuid FK → users
file_url                    text not null               -- Supabase Storage URL
original_filename           text not null
file_size_bytes             bigint not null
mime_type                   text not null
description                 text
related_cad_version_id      uuid FK → cad_versions
related_event_id            uuid FK → order_history_events
is_customer_visible         boolean default true
created_at                  timestamptz
updated_at                  timestamptz
deleted_at                  timestamptz                 -- soft delete
```

Allowed file types (enforced in app, not DB):
- Images: JPG, PNG, HEIC, WEBP
- Documents: PDF, DOC, DOCX, TXT
- 3D: STL, 3DM, OBJ, STEP (extension-based validation; mime types inconsistent)
- Video: MP4, MOV
- Archive: ZIP

Rejected: executables (.exe, .app, .bat, .sh), HTML, unknown types.

Notes:
- Soft delete preserves audit trail for compliance.
- Most queries filter `WHERE deleted_at IS NULL`.

---

# MASTER / REFERENCE TABLES

These tables hold reference data. Synced from software where applicable; some are portal-owned.

## 17. `metals`

```
id                              uuid PK
name                            text not null           -- "14k Yellow Gold"
short_code                      text                    -- "14kYG"
karat                           int                     -- NULL for non-gold
color                           text                    -- "yellow", "white", "rose", "n/a"
base_metal                      text                    -- "gold", "platinum", "silver", "palladium"
conversion_factor_from_10kyg    numeric(6,3) not null   -- 1.000 for 10kYG; multiply 10kYG-equivalent weight to get this metal's weight
is_active                       boolean default true
display_order                   int default 0
created_at                      timestamptz
updated_at                      timestamptz
```

Seed data (14 rows):

| name | short_code | karat | color | base_metal | conv_factor |
|---|---|---|---|---|---|
| 10k Yellow Gold | 10kYG | 10 | yellow | gold | 1.000 |
| 10k White Gold | 10kWG | 10 | white | gold | 1.000 |
| 10k Rose Gold | 10kRG | 10 | rose | gold | 1.000 |
| 14k Yellow Gold | 14kYG | 14 | yellow | gold | 1.124 |
| 14k White Gold | 14kWG | 14 | white | gold | 1.124 |
| 14k Rose Gold | 14kRG | 14 | rose | gold | 1.124 |
| 18k Yellow Gold | 18kYG | 18 | yellow | gold | 1.345 |
| 18k White Gold | 18kWG | 18 | white | gold | 1.345 |
| 18k Rose Gold | 18kRG | 18 | rose | gold | 1.345 |
| 22k Yellow Gold | 22kYG | 22 | yellow | gold | 1.562 |
| 24k Yellow Gold | 24kYG | 24 | yellow | gold | 1.660 |
| Platinum | PT | NULL | white | platinum | 1.808 |
| Silver | SS | NULL | white | silver | 0.905 |
| Palladium | PD | NULL | white | palladium | 1.080 |

Conversion math: `weight_in_target = weight_in_source × (target.conv_factor / source.conv_factor)`.

---

## 18. `stone_types`

```
id                  uuid PK
category            enum not null           -- stone_category: natural_diamond | lab_diamond | color_stone
name                text not null
short_code          text
is_active           boolean default true
display_order       int default 0
created_at          timestamptz
updated_at          timestamptz
```

Seed data (22 rows):

| category | name |
|---|---|
| natural_diamond | Natural Diamond |
| lab_diamond | Lab-Grown Diamond |
| color_stone | Alexandrite |
| color_stone | Amethyst |
| color_stone | Aquamarine |
| color_stone | Citrine |
| color_stone | Emerald |
| color_stone | Garnet |
| color_stone | Opal |
| color_stone | Pearl |
| color_stone | Peridot |
| color_stone | Ruby |
| color_stone | Yellow Sapphire |
| color_stone | Blue Sapphire |
| color_stone | Tanzanite |
| color_stone | Blue Topaz |
| color_stone | White Topaz |
| color_stone | Yellow Topaz |
| color_stone | Pink Topaz |
| color_stone | Pink Tourmaline |
| color_stone | Black Diamond |
| color_stone | Other |

Notes:
- Black Diamond is intentionally categorized as `color_stone` (uses AAA/AA grading, not D-Z/clarity).
- When stone_type is "Other", `custom_stone_type_name` is required on `order_*_stones`.
- Valid quality grades vary by category (form-side validation):
  - Natural diamond colors: D/E, F/G, H/I, J/K
  - Natural diamond clarities: I2, I1, SI2, SI1, VS2, VS1, VVS2, VVS1 (not all clarity-color combos valid)
  - Lab diamond colors: D/E/F
  - Lab diamond clarities: VVS1
  - Color stone grades: AAA, AA

---

## 19. `stone_shapes`

```
id                  uuid PK
name                text not null
short_code          text
is_active           boolean default true
display_order       int default 0
created_at          timestamptz
updated_at          timestamptz
```

Seed data (17 rows):

| name | short_code |
|---|---|
| Round | RD |
| Princess | PRN |
| Baguette | BAG |
| Tape Baguette | TBG |
| Marquise | MAR |
| Cushion | CUS |
| Trillion | TRL |
| Emerald | EM |
| Oval | OV |
| Pear | PR |
| Heart | HRT |
| Asscher | ASH |
| Radiant | RAD |
| Trapezoid | TZ |
| Half Moon | HM |
| Cadillac | CAD |
| Kite | KT |

---

## 20. `setting_styles`

```
id                  uuid PK
name                text not null
is_active           boolean default true
display_order       int default 0
created_at          timestamptz
updated_at          timestamptz
```

Seed data (9 rows):

| name |
|---|
| Prong |
| U Pave |
| U Prong |
| Wall Pave |
| Channel |
| Bezel |
| Single Prong |
| French Pave |
| Invisible |

Notes:
- Not all setting styles are valid for all stone shape × type combinations. Validity enforced in UI for Phase 2; will move to a `valid_combinations` table in Phase 3 when rate tables come in.

---

## 21. `product_types`

```
id                  uuid PK
name                text not null
short_code          text not null unique
is_active           boolean default true
display_order       int default 0
created_at          timestamptz
updated_at          timestamptz
```

Seed data (9 rows):

| name | short_code |
|---|---|
| Ring | R |
| Earring | E |
| Pendant | P |
| Necklace | N |
| Bracelet | BR |
| Locks | L |
| Charm | CH |
| Cufflinks | CL |
| Other | O |

Notes:
- `short_code` matches the existing software's product type codes (R, E, P, N, BR, L, CH, O).
- Cufflinks is NOT in the existing software yet. When that gets added, sync code maps "CL" both ways. Until then, cufflinks orders are portal-only.
- "Locks" = custom padlocks on pieces.

---

# Population & sync notes

**On first deployment** (no existing data):
- Master tables seeded with above data via initial migration.
- Operational tables empty.

**Sync from software (Phase 2+):**
- Customer data syncs IN via software's existing push API (matches `SyncApiController.cs` contract). Portal mimics the receiving endpoint.
- Order data submitted FROM portal will eventually push TO software (software team writes that integration).
- Master data updates from software (e.g., AMs adding a new stone type) sync IN to override our copy.

**Customer code, order number, style number:**
- Generated by software. Portal stores copies.
- On portal-initiated submission, the portal creates the record without these IDs, then receives them back from software via sync.

**CAD versions and quotes:**
- Software overwrites; portal preserves history.
- When software pushes a CAD update, portal creates a NEW `cad_versions` row.
- When software pushes a quote update, portal creates NEW `cad_version_quote_lines` for the new version. Old quote rows stay tied to old versions.

---

# Notes for migration writers

1. **Create enums first**, then tables that reference them, then constraints/indexes.
2. **Suggested order:**
   - Enums (all of them)
   - Master tables (no FK dependencies)
   - `customers` (depends on `users` via assigned_am_id — handle with deferred FK or add later)
   - `users` (depends on `customers` via customer_id)
   - Resolve `customers.assigned_am_id` FK now
   - Operational tables (orders, then order_*, then cad_versions, then cad_version_*)
   - Indexes
3. **RLS policies** are NOT in this document. Design those in a separate auth conversation.
4. **Triggers for updated_at** can be a single function applied to all tables.
5. **Seed master data** in a separate migration after table creation.
