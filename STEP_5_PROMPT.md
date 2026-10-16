# Step 5 Prompt — Sections 05 + 06 (Center + Accent Stones)

**Paste this in full to Claude Code when starting Session 13's Step 5 work. Spec is fully locked from the prior chat session — no clarifying questions needed before you start. Read this end to end, then verify the schema discovery items at the bottom before any code, then proceed.**

---

Goal: Build Section 05 (Center stones) and Section 06 (Accent stones). Both are repeating-row sections gated on `finish_point = finished_piece` plus product-type rules. Two new server actions, one combined migration adding two RPCs.

## Gates and visibility

**Section 05 (Center stones)** visibility:
- Hidden when `finish_point ≠ finished_piece`
- Hidden when `product_type ∈ {bracelet, charm, locks, cufflinks}`
- Shown when `finish_point = finished_piece` AND `product_type ∈ {ring, pendant, earring, necklace, other}`

**Section 06 (Accent stones)** visibility:
- Hidden when `finish_point ≠ finished_piece`
- Shown for ALL 9 product types when `finish_point = finished_piece`

**Gate UI:** Each section has a yes/no/tbd gate at the top, rendered as three pill buttons (matching the existing product-type pill pattern from Phase 2A). Stored as `orders.has_center_stones` and `orders.has_accent_stones`.

**Stale data cleanup:** When a section becomes hidden (product_type switch from ring → bracelet, or finish_point downgrade from finished_piece → polished_mounting), silently delete the corresponding stone rows from the DB. Same defensive pattern as the engraving position clearing from Step 2. The gate value (`has_center_stones` / `has_accent_stones`) should also clear back to null when the section becomes hidden.

## Center stones — per-row fields

The form changes which fields render based on stone type. Two field sets:

**For Natural Diamond and Lab Diamond types:**
- Type dropdown (from `stone_types` master)
- Shape dropdown (from `stone_shapes` master — all shapes valid for all types in Phase 2B)
- Supply source dropdown — Customer / Dia-Co / Mixed
- Carat range — two number inputs side-by-side with the word "to" between them
- Color range — two dropdowns, options: D / E / F / G / H / I / J / K / L / M / N+
- Clarity range — two dropdowns, options: FL / IF / VVS1 / VVS2 / VS1 / VS2 / SI1 / SI2 / I1 / I2 / I3
- Make range — two dropdowns, options: Excellent / Very Good / Good / Fair / Poor
- Certification dropdown — different list per diamond type:
  - **Natural Diamond:** GIA / IGI / HRD / Other / None
  - **Lab Diamond:** GIA / IGI / GCAL / Other / None

**For Color Stone types (sapphire, ruby, emerald, etc.):**
- Type dropdown
- Shape dropdown
- Supply source
- Carat range (two number inputs)
- Certification dropdown — GIA / CDC / GRS / AGL / Other / None
- **No color/clarity/make fields** — these aren't graded the same way for color stones

## Center stones — layout

3-column grid per row, mirroring the Section 04 metal row compaction. Three rows of fields when type is a diamond, two rows when type is a color stone:

```
Diamond row (3-col grid):
  Row 1: TYPE          | SHAPE         | SUPPLY
  Row 2: CARAT RANGE   | COLOR RANGE   | CLARITY RANGE
  Row 3: MAKE RANGE    | CERTIFICATION | (empty)

Color stone row (3-col grid):
  Row 1: TYPE          | SHAPE         | SUPPLY
  Row 2: CARAT RANGE   | CERTIFICATION | (empty)
```

Range fields render as two compact inputs/selects with "to" centered between them. Adapt to narrower viewports gracefully (same approach as metals).

## Accent stones — per-row fields

Just two fields:
- Type dropdown (from `stone_types` master)
- Supply source dropdown

That's it. No shape, no quantity, no size, no carat, no color/clarity/make, no cert. 2-column grid, one row of fields per accent group.

## Supply source disclaimer

**Trigger:** Any stone row in either Section 05 or Section 06 with `supply_source ∈ {customer, mixed}`.

**Text (exact wording):**
> If you plan to supply stones, we need them 48 hours before production can begin — for measurement, inspection, and any necessary design adjustments.

**Placement:**
- Top of each section that has at least one triggering row (above the first stone row)
- Both sections trigger independently — disclaimer can appear at top of 05 AND top of 06 simultaneously if both have customer-supplied rows
- Live Summary right rail: short "⚠ Stones to be supplied" mention only (not the full text)

**Visual style:** Cream/tan info banner matching the brand palette. Use the same visual treatment as the existing "Quotes are always free" banner at the top of the form. Non-alarming, informational tone.

## Summary chips when section is collapsed

**Section 05 (Center stones):**
- Gate = "no": `No center stones`
- Gate = "tbd": `Center stones — to be confirmed`
- Unanswered (gate null): `Not yet entered`
- 1 row entered: verbose — `1.0–1.5ct Round Natural Diamond, D–F, VVS1–VS2`
  - Show carat range, shape, type, color range (if diamond), clarity range (if diamond)
  - For color stones: `1.5–2.0ct Oval Sapphire`
- 2 rows entered: abbreviated — `2 center stones: Round Natural Diamond + Oval Sapphire`
- 3+ rows: count only — `3 center stones`
- Same-type duplicates at 2+ rows: dedupe with count — `Natural Diamond (×2)`

**Section 06 (Accent stones):**
- Gate = "no": `No accent stones`
- Gate = "tbd": `Accent Stones — to be confirmed`
- Unanswered (gate null): `Not yet entered`
- 1-3 rows entered: `Accent Stones: Natural Diamonds + Sapphires`
- 4+ rows: `Accent Stones: 4 types`
- Same-type duplicates: dedupe with count — `Natural Diamonds (×2)`

## Soft caps

- Center stones: 7 rows max — hide "Add another center stone" button when 7 rows present
- Accent stones: 5 rows max — hide "Add another accent stone" button when 5 rows present

Remove button on each row hidden when only 1 row exists in that section.

## Schema — combined migration

One migration file (number 21) adds two SECURITY DEFINER plpgsql functions:

```
save_order_center_stones(p_order_id uuid, p_rows jsonb) returns void
save_order_accent_stones(p_order_id uuid, p_rows jsonb) returns void
```

Both follow the migration 19 + 20 template exactly:
- `SECURITY DEFINER` with `SET search_path = public, pg_temp`
- Whole-section re-serialize: DELETE all existing rows for `p_order_id`, then INSERT from JSONB array
- Use `nullif(trim(elem->>'field'), '')` for any nullable text fields
- `GRANT EXECUTE ... TO service_role`
- **`REVOKE EXECUTE ... FROM PUBLIC`** — bake this into the SAME migration, lesson from migration 20

Show the full SQL of migration 21 to Arpit before applying. Per-action approval on `supabase db push`.

After applying, run the grants verification SELECT for BOTH functions to confirm PUBLIC has no execute:

```sql
SELECT grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name IN ('save_order_center_stones', 'save_order_accent_stones')
  AND routine_schema = 'public';
```

## Server actions — two new files

- `src/lib/orders/saveCenterStones.ts`
- `src/lib/orders/saveAccentStones.ts`

Each follows the `saveMetals.ts` pattern exactly:
- Server-only, service-role client
- Calls its respective RPC via `supabase.rpc(...)`
- Independent debounce (1000ms, separate timer from saveDraft, saveMetals, and each other)
- Each section autosaves independently — editing center stones does NOT trigger an accent save and vice versa
- TODO comment about service-role swap when auth lands (mirror saveMetals.ts comment)
- Returns `{ ok, error? }` shape

## Form state shape

```typescript
type StoneRangeNumber = { min: string; max: string }  // strings for input flexibility
type StoneRangeEnum = { min: string | null; max: string | null }  // null = "any"

interface CenterStoneRow {
  stoneTypeId: string | null         // FK → stone_types
  shapeId: string | null             // FK → stone_shapes
  supplySource: "customer" | "diaco" | "mixed" | null
  caratRange: StoneRangeNumber
  colorRange: StoneRangeEnum         // only relevant for diamonds, null for color stones
  clarityRange: StoneRangeEnum       // only relevant for diamonds
  makeRange: StoneRangeEnum          // only relevant for diamonds
  certification: string | null       // enum value
}

interface AccentStoneRow {
  stoneTypeId: string | null         // FK → stone_types
  supplySource: "customer" | "diaco" | "mixed" | null
}

// In FormFields:
centerStones: CenterStoneRow[]
accentStones: AccentStoneRow[]
```

Each row gets a client-side UUID for React keys (same pattern as metals). Initial state: empty arrays. Rows added by clicking the "Add another stone" button when gate = "yes".

## Validation deferred to Step 6

`submitValidation.ts` will enforce:

- `has_center_stones` required at submit when `finish_point = finished_piece` AND `product_type ∈ {ring, pendant, earring, necklace, other}`
- `has_accent_stones` required at submit when `finish_point = finished_piece`
- If `has_center_stones = "yes"`: at least 1 center stone row with type + shape + supply_source populated
- If `has_accent_stones = "yes"`: at least 1 accent stone row with type + supply_source populated
- All range/grade/cert fields are optional at submit (capture what the customer knows, no more)

Note these in code comments where appropriate. Don't implement validation in Step 5 — that's Step 6's job and the single source of truth lives in `submitValidation.ts`.

## Schema discovery items — STOP and ask before proceeding if any of these are missing

Before writing any UI code or migration SQL, check the schema and surface any gaps:

1. **`stone_types` master table** — does it have a column distinguishing diamond vs. color stone? (e.g., a boolean `is_diamond`, an enum `grading_style`, or a category column). The form needs to know which fields to render per stone type. If the column doesn't exist, propose migration 22 to add it and stop for Arpit's approval before applying.

2. **`order_center_stones` table columns** — does it have separate min/max columns for carat, color, clarity, and make? Schema needs columns like:
   - `carat_min`, `carat_max` (numeric, nullable)
   - `color_min`, `color_max` (text or enum, nullable)
   - `clarity_min`, `clarity_max` (text or enum, nullable)
   - `make_min`, `make_max` (text or enum, nullable)
   - `certification` (text or enum, nullable)
   - `supply_source` (enum, required when row exists)
   - `stone_type_id` (FK, required)
   - `shape_id` (FK, required when row exists for diamonds)
   - `display_order` (int)

   If the table currently has single-value columns (e.g., `color` instead of `color_min`/`color_max`), propose a migration to add the range columns and stop for Arpit's approval. Per Session 12's lesson, don't apply a schema migration without showing SQL first.

3. **`order_accent_stones` table columns** — should be minimal:
   - `stone_type_id` (FK)
   - `supply_source` (enum)
   - `display_order` (int)
   - Other columns can exist but should be left NULL by the form

4. **Color / Clarity / Make / Certification** — are these stored as enums in the DB or text? Either works, but type the inserts accordingly. If they're enums, confirm all expected values exist.

5. **`stone_shapes` master table** — confirm it's populated. The form's shape dropdown reads from it.

If any of items 1, 2, or 3 require a schema change, the migration to handle that comes FIRST as its own commit, then the RPC migration (currently planned as 21) shifts to migration 22 or 23. Number sequentially based on what's needed.

## Build sequence

Recommended commit cadence:
1. Schema gap migrations (if needed, e.g., migration 21 to add range columns or stone_types category)
2. RPC migration adding `save_order_center_stones` + `save_order_accent_stones` (with the REVOKE PUBLIC included)
3. Server actions (`saveCenterStones.ts` + `saveAccentStones.ts`)
4. Section 05 UI (Center stones with type-dependent fields, range pickers, disclaimer)
5. Section 06 UI (Accent stones, minimal fields, disclaimer)
6. Live Summary updates (chip behavior, supply-warning indicator)
7. Stale-data cleanup wiring (product_type switch + finish_point downgrade triggers)

Each commit shipped separately, each with verification SELECT in the ship message showing relevant rows. After each migration: function metadata SELECT + grants SELECT. Stop and wait for Arpit's verification between any one-way doors (schema changes) and the UI work that depends on them.

## Hard "do not" list

- Do NOT skip the REVOKE FROM PUBLIC on the new RPCs — bake it in the same migration as the function CREATE
- Do NOT touch Sections 01-04, 07, 08, 09 — they're verified and shouldn't regress
- Do NOT generate TypeScript types from the DB — keep using inline `any` like the rest of the project
- Do NOT implement Step 6 validation now — defer to Step 6
- Do NOT blanket-approve any `supabase db *` command
- Do NOT bypass the schema discovery check at the top of this prompt — stop and ask if any items 1-5 surface gaps

## Cadence

Per-action approval throughout. Per the locked working agreement: pre-step conversation is already done in chat with Arpit, this prompt is the green-light, no further design questions should arise mid-build unless schema discovery surfaces something genuinely new.

When you finish all commits, post a final summary noting the end-to-end test plan for Arpit to run on production. Then stop and wait for Step 5 verification before any Step 6 work.

---

*End of Step 5 prompt.*
