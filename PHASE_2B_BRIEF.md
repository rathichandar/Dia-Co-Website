# Phase 2B Brief — Order Entry: Sections 04-09 + Submit + Drafts

**For Claude Code (Session 12). Read this file before starting work.**

---

## Context

You are continuing the Dia-Co Portal build. Phase 2A shipped in Session 11 — `/orders/new` is live with sections 01-03 functional and sections 04-09 as "Coming soon" shells. Production is on commit `54e67c0` at https://diaco-portal.vercel.app/orders/new.

Read `PROJECT_CONTEXT.md` for full background. This brief covers only Phase 2B scope.

---

## Goal

Build Order Entry Phase 2B: sections 04-09 internals, Submit action, Drafts tab on `/orders`.

---

## Build order (locked)

Work in this exact order. Each step is independently shippable — commit after each.

1. **Section 09 (Notes)** — single textarea, autosaves to `orders.submission_notes`
2. **Section 07 (Engraving)** — text + checkbox + position dropdown, conditional on finish_point ∈ {polished_mounting, finished_piece}
3. **Section 08 (Shipping)** — three-way (standard / different_address / drop_ship), conditional address fields
4. **Section 04 (Metal)** — repeating UI, karat + color + finish per row, NO weight field shown to customer
5. **Sections 05 + 06 (Center + Accent stones)** — Yes/No/TBD gate, repeating rows; accent has no quantity/size field
6. **Submit action** — `submitOrder(orderId)` server action: validate, transition `status='draft'` → `status='designing'`, `sub_status='awaiting_design'`, write history event
7. **Drafts tab on `/orders`** — query `status='draft'` filtered by current user; update Active tab query to exclude drafts

---

## Autosave pattern for repeating sections (04/05/06) — locked

**Whole-section re-serialize.** On any change to a row (add/edit/delete), debounce 1000ms, then:

```
BEGIN;
DELETE FROM order_metals WHERE order_id = $orderId;
INSERT INTO order_metals (...) VALUES (...), (...), ...;
COMMIT;
```

Three new server actions, parallel to existing `saveDraft`:
- `saveMetals(orderId, metals[])`
- `saveCenterStones(orderId, stones[])`
- `saveAccentStones(orderId, stones[])`

Each fires independently. Editing metals does NOT trigger a stones save. Each uses the service-role Supabase client (mirror `saveDraft.ts`). Add the same TODO comment about swapping when real RLS lands.

---

## Identifier display logic (new shared helper)

Create `src/lib/orders/displayIdentifier.ts`. Returns the secondary identifier shown alongside the DG order number:

- If `endCustomerName` is non-empty → return it
- Else if `clientPo` is non-empty → return it
- Else → return `'Untitled draft'`

`'Untitled draft'` only appears on drafts because submitted orders are guaranteed (by Submit validation) to have at least one of name/PO.

Use this helper on:
- `/orders` cards (current Active + Cancelled, plus new Drafts tab)
- `/orders/[id]` breadcrumb + header
- `/history` rows
- Future dashboard (out of scope for Phase 2B but design with this in mind)

PO is shown as plain text (no "PO:" label prefix).

---

## Submit validation (locked) — lives in `src/lib/orders/submitValidation.ts`

This file is the single source of truth. Both the Submit server action AND the client-side disabled-button logic call this function.

**Always required:**

- At least one of: `endCustomerName` OR `clientPo`
- `productType`
- `finishPoint`
- `pieceDescription`
- `shippingMethod`

**Conditional:**

- `productType ∈ {ring, bracelet, necklace}` → `size` required
- `finishPoint ∈ {raw_casting, polished_mounting, finished_piece}` → at least one metal row, each with `karat` + `color`
- `finishPoint = finished_piece` → `hasCenterStones` AND `hasAccentStones` must be answered (`yes` | `no` | `tbd` — all three count as answered)
- `hasCenterStones = 'yes'` → at least one center stone row with `type` + `shape` + `supplySource`
- `hasAccentStones = 'yes'` → at least one accent stone group with `type` + `supplySource`
- Engraving has text OR "use my logo" checked → `engravingPosition` required
- `shippingMethod ∈ {different_address, drop_ship}` → recipient name, address line 1, city, state, postal code, phone all required

**Validation function shape:**

```typescript
type ValidationResult =
  | { valid: true }
  | { valid: false; errors: { [field: string]: string }; missingCount: number };

function validateForSubmit(order: OrderDraft): ValidationResult
```

`missingCount` powers the Submit button label: "Submit (3 required fields missing)" when disabled.

---

## Customer-supplied stone disclaimer (informational, non-blocking)

Fires when **any** center stone row OR accent stone group has `supplySource = 'customer_supplied'` (also fires for `'mixed'`).

**Text:**
> If you plan to supply stones, we need them 48 hours before production can begin — for measurement, inspection, and any necessary design adjustments.

**Display locations:**
- Top of the relevant stones section (Center or Accent) when any of its rows triggers
- Live Summary right rail under a "Note" heading when any row anywhere triggers

Does NOT block submission.

---

## What is NOT shown to the customer

These columns exist in the DB and are filled by Dia-Co internally. Do not surface them in the form:

- `order_metals.weight_grams` (or whatever the column name is)
- `order_accent_stones.quantity`
- `order_accent_stones.stone_size_*` (any size-related columns)

Confirm column names from `SCHEMA.md` before writing the form.

---

## Conditional section visibility (already exists from Phase 2A — applies to new sections)

| finish_point        | Metal (04) | Center (05) | Accent (06) | Engraving (07) | Shipping (08) | Notes (09) |
| ------------------- | ---------- | ----------- | ----------- | -------------- | ------------- | ---------- |
| `file`              | hide       | hide        | hide        | hide           | show          | show       |
| `wax`               | hide       | hide        | hide        | hide           | show          | show       |
| `raw_casting`       | show       | hide        | hide        | hide           | show          | show       |
| `polished_mounting` | show       | hide        | hide        | show           | show          | show       |
| `finished_piece`    | show       | show        | show        | show           | show          | show       |

Accent stones are NEVER shown for polished_mounting — polished mounting is an empty setting, no stones at all.

---

## Submit action specifics (Step 6)

`submitOrder(orderId: string)` server action:

1. Load the order draft (and all related metal/stone rows) from DB.
2. Run `validateForSubmit()`. If invalid, return `{ ok: false, errors }` — do NOT mutate state.
3. If valid, in a single transaction:
   - `UPDATE orders SET status='designing', sub_status='awaiting_design', submitted_at=now() WHERE id = $orderId`
   - `INSERT INTO order_history_events (order_id, event_type, actor_user_id, ...)` with `event_type='submitted'`
4. Return `{ ok: true, orderId }`.
5. On the client, redirect to `/orders/[orderId]` on success.

**Submit button behavior:**
- Disabled when client-side `validateForSubmit()` returns invalid
- Label when disabled: `Submit (N required fields missing)` where N is `missingCount`
- Label when enabled: `Submit order`
- On click: call server action, show loading state, redirect on success, surface errors inline if server validation disagrees with client (shouldn't happen, but defensive)

---

## Drafts tab on `/orders` (Step 7)

- Add a third tab between Active and Cancelled labeled **Drafts**
- Query: `status = 'draft' AND submitted_by_user_id = currentUser.id` (currentUser is still hardcoded Marcus Bennett UUID until auth ships — same pattern as Phase 2A)
- **Update the Active tab query to exclude `status='draft'`** (this is a regression risk — drafts currently might show on Active; verify before/after)
- Card layout: same visual as Active cards, but:
  - No status pill (drafts have no stage)
  - Replace status pill with `"Last edited Xm ago"` line in same position
  - Card click routes to `/orders/new?orderId=X` (resume editing), NOT `/orders/[orderId]`
- Use `displayIdentifier` helper for the secondary line — this is where `'Untitled draft'` can appear

---

## Files you will create or modify

**Create:**
- `src/lib/orders/displayIdentifier.ts`
- `src/lib/orders/submitValidation.ts`
- `src/lib/orders/saveMetals.ts`
- `src/lib/orders/saveCenterStones.ts`
- `src/lib/orders/saveAccentStones.ts`
- `src/lib/orders/submitOrder.ts`

**Modify:**
- `src/components/orders/new/NewOrderForm.tsx` — replace shells with functional sections, wire Submit button
- `src/app/orders/page.tsx` (the orders list) — add Drafts tab, update Active query
- `src/app/orders/[orderId]/page.tsx` — swap header/breadcrumb to use `displayIdentifier`
- `src/app/history/page.tsx` — same swap to `displayIdentifier`
- `src/app/diaco-design.css` — new styles for repeating-row UI (add/remove buttons, row layout)

**Possibly create migration:**
- Only if you discover a schema gap. The Session 11 audit was thorough but not exhaustive. If you find a missing column, stop and ask before writing migration 18. Do not blanket-approve any `supabase db` command.

---

## Hard "do not" list

- Do NOT touch `/orders/[id]` page logic beyond the `displayIdentifier` swap
- Do NOT touch `/history` page logic beyond the `displayIdentifier` swap
- Do NOT generate Database types — keep using inline `any` like elsewhere
- Do NOT implement real Supabase Storage (uploads stay stubbed; the existing TODO comments stay)
- Do NOT swap service-role key for cookie-bound client (waits for Session 13 auth work)
- Do NOT add toast UI yet (use `console.log` for failures, matching Phase 2A — flagged as open item)
- Do NOT blanket-approve DB or git operations — stay on per-action approval (option 1)

---

## Commit cadence

One commit per step (1 through 7). Each commit message starts with `Phase 2B:` and names the step. Examples:

- `Phase 2B: Section 09 (Notes) functional with autosave`
- `Phase 2B: Section 04 (Metal) repeating UI with whole-section re-serialize`
- `Phase 2B: Submit action + client validation`

Push after each commit. Verify production build still passes on Vercel before moving to the next step.

---

## When to stop and ask Arpit

Stop and ask in this chat (or wait for Arpit) if:

- You discover a schema gap that needs a migration
- The validation rules I provided conflict with something in the existing code
- A section's autosave pattern hits a race or constraint violation you can't resolve in <15 minutes
- You're about to do anything destructive (drop table, blanket update, force push)

Otherwise, work through the build order without stopping.

---

*End of brief.*
