"use client"

// ============================================================
// NewOrderForm
// Order entry form — Phase 2A.
//
// State strategy:
//   - fields: the form values, owned here
//   - draftId: null until the first save lands an INSERT; thereafter
//     all saves are UPDATEs against this UUID
//   - saveStatus + lastSavedAt: drive the autosave indicator
//   - openSections: which .osec section ids are expanded
//
// Autosave:
//   - 1000ms debounce after the last change
//   - Calls saveDraft Server Action; reconciles draftId on first response
//   - "Save failed" indicator on error; the next change retries
//
// Sections 01-03 are wired. 04-09 are collapsible shells with
// "Coming soon" content. 04-06 also have conditional visibility
// based on the chosen finish_point.
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  Construction,
  Info,
  Loader2,
  Upload,
  X,
} from "lucide-react"
import {
  saveDraft,
  type DraftFields,
  type EngravingPosition,
  type HasStones,
  type MetalFinish,
  type ShippingMethod,
} from "@/lib/orders/saveDraft"
import { discardSingleDraft } from "@/lib/orders/discardDrafts"
import {
  saveMetals,
  type MetalRowPayload,
} from "@/lib/orders/saveMetals"
import {
  saveCenterStones,
  type CenterStoneRowPayload,
  type StoneSupply,
} from "@/lib/orders/saveCenterStones"
import {
  saveAccentStones,
  type AccentStoneRowPayload,
} from "@/lib/orders/saveAccentStones"
import {
  missingCenterStoneFields,
  isCenterStoneRowComplete,
  missingAccentStoneFields,
  isAccentStoneRowComplete,
  validateForSubmit,
  type CenterStoneRow,
  type CenterStoneTopType,
  type AccentStoneRow,
  type AccentStoneTopType,
  type FinishPoint,
  type ValidationInput,
  type SubmitValidationResult,
} from "@/lib/orders/submitValidation"
import { submitOrder } from "@/lib/orders/submitOrder"
import { relativeTime } from "@/lib/relativeTime"
import {
  EMPTY_METAL_ROW,
  EMPTY_CENTER_STONE_ROW,
  EMPTY_ACCENT_STONE_ROW,
  INITIAL_FIELDS,
  type FormFields,
  type MetalRow,
} from "@/lib/orders/formInitial"
import type { InitialDraft } from "@/lib/orders/fetchDraftForResume"
import { US_STATES } from "@/lib/usStates"
import type {
  CustomerForForm,
  MetalOption,
  StoneShapeOption,
  StoneTypeOption,
} from "@/app/(authenticated)/orders/new/page"

// ─── Types ───────────────────────────────────────────────────────────

interface ProductTypeOption {
  id: string
  name: string
  short_code: string
}

interface NewOrderFormProps {
  customerId: string
  productTypes: ProductTypeOption[]
  customer: CustomerForForm
  metals: MetalOption[]
  stoneTypes: StoneTypeOption[]
  stoneShapes: StoneShapeOption[]
  // Step 7: server-side resume hydration. When non-null, form mounts
  // with the projected state from the existing draft. Otherwise the
  // form starts clean (INITIAL_FIELDS, draftId=null).
  initialDraft: InitialDraft | null
}

// FinishPoint type lives in submitValidation.ts (the canonical home for
// validation-related types). FormFields, INITIAL_FIELDS, MetalRow, and
// the EMPTY_* row constants moved to formInitial.ts so fetchDraftForResume
// (server-only) can share the shapes for Step 7 hydration. Imported above.

type SaveStatus = "idle" | "saving" | "saved" | "error"

const DEBOUNCE_MS = 1000

// Pill labels for finish point (key + helper copy).
const FINISH_POINTS: Array<{ key: FinishPoint; label: string; help: string }> = [
  { key: "file", label: "File", help: "We deliver the CAD file. You handle printing, casting, everything." },
  { key: "wax", label: "Wax", help: "We deliver a printed wax model. Ready to cast." },
  { key: "raw_casting", label: "Raw casting", help: "We cast in your metal of choice. You polish and set." },
  { key: "polished_mounting", label: "Polished mounting", help: "Ready to set. Stones and final polish are yours." },
  { key: "finished_piece", label: "Finished piece", help: "Complete and ready to ship. We handle everything." },
]

// Which short_codes ask for a size field (and what to hint for each).
const SIZE_REQUIRED = new Set(["R", "BR", "N"]) // Ring, Bracelet, Necklace
const SIZE_HINTS: Record<string, string> = {
  R: "US size, e.g., 6.5",
  BR: "Length, e.g., 7.5 inches",
  N: "Length, e.g., 18 inches",
}

// Default-open section ids.
const DEFAULT_OPEN = new Set([1, 2, 3])

// ─── Helpers ─────────────────────────────────────────────────────────

// relativeTime moved to @/lib/relativeTime so the drafts table can
// reuse it (and add a sibling long-form variant). Imported above.

// Display labels for every value in the engraving_position enum.
// Sub-set of these values is shown per product type — see positionOptionsFor().
const ENGRAVING_POSITION_LABEL: Record<EngravingPosition, string> = {
  inside_shank_top: "Inside shank — Top",
  inside_shank_bottom: "Inside shank — Bottom",
  inside_shank_left: "Inside shank — Left",
  inside_shank_right: "Inside shank — Right",
  back_of_bail: "Back of bail",
  back_of_body: "Back of body",
  back_top: "Back — Top",
  back_middle: "Back — Middle",
  back_bottom: "Back — Bottom",
  other: "Other (we'll confirm)",
}

const POSITIONS_RING_BRACELET: EngravingPosition[] = [
  "inside_shank_top",
  "inside_shank_bottom",
  "inside_shank_left",
  "inside_shank_right",
]
const POSITIONS_PENDANT: EngravingPosition[] = ["back_of_bail", "back_of_body"]
const POSITIONS_BACK: EngravingPosition[] = ["back_top", "back_middle", "back_bottom"]

// Maps product_types.short_code → the position values the dropdown shows.
// "other" is always appended.
function positionOptionsFor(
  productTypeShortCode: string | null,
): EngravingPosition[] {
  let base: EngravingPosition[]
  switch (productTypeShortCode) {
    case "R": // Ring
    case "BR": // Bracelet
      base = POSITIONS_RING_BRACELET
      break
    case "P": // Pendant
      base = POSITIONS_PENDANT
      break
    case "E": // Earring
    case "N": // Necklace
    case "L": // Locks
    case "CH": // Charm
    case "CL": // Cufflinks
    case "O": // Other
      base = POSITIONS_BACK
      break
    default:
      // No product type yet → only "other" until they pick one.
      return ["other"]
  }
  return [...base, "other"]
}

// ── Section 04 (Metal) ────────────────────────────────────────────
// (MetalRow + EMPTY_METAL_ROW are declared near the top of the file
// so INITIAL_FIELDS can reference them.)

const MAX_METAL_ROWS = 4

// Finish dropdown options. The enum on the DB still has 'brushed' and the
// original 'antiqued', but the form deliberately hides 'brushed' entirely
// and only surfaces 'antiqued' when the row's metal is Silver (see
// availableFinishesForMetal below). The DB will simply never receive
// 'brushed' values via the form. Display label for 'sandblast' is
// "Sandblasted" — enum value unchanged.
//
// Finish is no longer submit-required (per Section 04 refinement spec).
// Step 6 submitValidation.ts: do NOT include row.finish in required checks.
const METAL_FINISH_OPTIONS: Array<{ value: MetalFinish; label: string }> = [
  { value: "high_polish", label: "High polish" },
  { value: "matte", label: "Matte" },
  { value: "satin", label: "Satin" },
  { value: "sandblast", label: "Sandblasted" },
  { value: "hammered", label: "Hammered" },
]

// Optional row appended only when the selected metal is Silver.
const ANTIQUED_OPTION: { value: MetalFinish; label: string } = {
  value: "antiqued",
  label: "Antiqued",
}

const FINISH_LABEL: Record<MetalFinish, string> = {
  high_polish: "High polish",
  matte: "Matte",
  brushed: "Brushed", // legacy value; not surfaced by the form
  satin: "Satin",
  sandblast: "Sandblasted",
  hammered: "Hammered",
  antiqued: "Antiqued",
}

// Detect Silver via short_code on the metals master row.
function isSilverMetal(metalId: string | null, metalOptions: MetalOption[]) {
  if (!metalId) return false
  return metalOptions.find((m) => m.id === metalId)?.short_code === "SS"
}

function availableFinishesForMetal(
  metalId: string | null,
  metalOptions: MetalOption[],
): Array<{ value: MetalFinish; label: string }> {
  return isSilverMetal(metalId, metalOptions)
    ? [...METAL_FINISH_OPTIONS, ANTIQUED_OPTION]
    : METAL_FINISH_OPTIONS
}

// Validate the metals array. Returns per-row error message (or null) and
// whether the section is safe to autosave.
function validateMetals(
  rows: MetalRow[],
): { rowErrors: (string | null)[]; sectionValid: boolean } {
  const rowErrors: (string | null)[] = rows.map(() => null)
  if (rows.length <= 1) {
    return { rowErrors, sectionValid: true }
  }
  // 2+ rows → every row needs a non-empty unique area.
  // Compare case-insensitive + whitespace-trimmed.
  const norm = (s: string) => s.trim().toLowerCase()
  const seenAt = new Map<string, number>()
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i].area
    if (!a.trim()) {
      rowErrors[i] = "Area is required when you have multiple metals."
      continue
    }
    const key = norm(a)
    if (seenAt.has(key)) {
      const firstIdx = seenAt.get(key)!
      rowErrors[i] = `Each metal needs a unique area. '${rows[firstIdx].area.trim()}' is already used.`
    } else {
      seenAt.set(key, i)
    }
  }
  const sectionValid = rowErrors.every((e) => e === null)
  return { rowErrors, sectionValid }
}

// Project MetalRow[] → RPC payload (only includes rows with a metal_id;
// untouched empty rows aren't persisted).
function metalsToPayload(rows: MetalRow[]): MetalRowPayload[] {
  return rows
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => r.metal_id !== null)
    .map(({ r, idx }) => ({
      metal_id: r.metal_id!,
      area: r.area.trim() || null,
      finish: r.finish,
      display_order: idx,
    }))
}

function metalsSummary(
  rows: MetalRow[],
  metalOptions: MetalOption[],
): string | null {
  const populated = rows.filter((r) => r.metal_id !== null)
  if (populated.length === 0) return null

  const optById = new Map(metalOptions.map((o) => [o.id, o]))

  if (populated.length === 1) {
    const r = populated[0]
    const opt = optById.get(r.metal_id!)
    if (!opt) return null
    const parts = [opt.label]
    if (r.finish) parts.push(FINISH_LABEL[r.finish])
    if (r.area.trim()) parts.push(r.area.trim())
    return parts.join(" · ")
  }

  if (populated.length === 2) {
    return populated
      .map((r) => {
        const opt = optById.get(r.metal_id!)
        const label = opt?.label ?? "—"
        return r.area.trim() ? `${label} (${r.area.trim()})` : label
      })
      .join(" + ")
  }

  // 3 or 4 → abbreviated by short_code
  const codes = populated
    .map((r) => optById.get(r.metal_id!)?.short_code ?? "—")
    .join(" + ")
  return `${codes} (${populated.length} metals)`
}

// ── Section 05 (Center stones) ────────────────────────────────────

// Reduced from 7 to 3 per the locked spec — one center stone row maps to
// one stone, and most pieces don't carry more than 2-3 centers.
const MAX_CENTER_STONE_ROWS = 3

// Section 06 soft cap — UI-only, parallels MAX_CENTER_STONE_ROWS. Backend
// imposes no limit; the cap is purely a "this form would feel cluttered
// past N rows" decision per the locked spec.
const MAX_ACCENT_STONE_ROWS = 5

// Natural Diamond + Dia-Co quality picks. Color tier is gate-required;
// Clarity options depend on Color tier so the dropdown filters dynamically.
// Locked spec (PROJECT_CONTEXT §15 / Section 06 quality):
//   F/G → broad clarity range
//   H/I → narrower (cheaper stones — lower clarity options drop out)
//   J/K → narrowest (only two viable options at this color tier)
const NATURAL_DIAMOND_COLOR_OPTIONS = ["F/G", "H/I", "J/K"] as const

const NATURAL_DIAMOND_CLARITY_BY_COLOR: Record<string, string[]> = {
  "F/G": ["VVS", "VS1", "VS2", "SI1", "SI2", "I1", "I2"],
  "H/I": ["VVS", "VS2", "SI1", "SI2"],
  "J/K": ["VS2", "SI2"],
}

// Lab-Grown Diamond auto-selected values. Single industry tier at our
// volume — captured as constants so the payload write and the static
// display read from the same source.
const LAB_DIAMOND_AUTO_COLOR = "E/F"
const LAB_DIAMOND_AUTO_CLARITY = "VVS"

// Product-type short_codes for which Section 05 is shown when finish_point
// = 'finished_piece'. Brief: ring, pendant, earring, necklace, other.
// Hidden for bracelet, locks, charm, cufflinks even at finished_piece.
// Section 06 (accents) is shown for ALL 9 product types at finished_piece —
// no equivalent restriction needed.
const PRODUCT_TYPES_WITH_CENTER_STONES = new Set(["R", "P", "E", "N", "O"])

// Supply dropdown labels — locked spec. The DB enum values stay the same,
// only the customer-facing labels change.
//   customer → "I'll supply"
//   diaco    → "Dia-Co supplies"
//   mixed    → "Mixed — some of each"  (accents only)
const SUPPLY_LABELS: Record<StoneSupply, string> = {
  customer: "I'll supply",
  diaco: "Dia-Co supplies",
  mixed: "Mixed — some of each",
}

// Center stones: only 2 supply options. One row = one stone, so the
// supplier is definitive. "Mixed" is accent-only.
const CENTER_STONE_SUPPLY_OPTIONS: Array<{
  value: StoneSupply
  label: string
}> = [
  { value: "customer", label: SUPPLY_LABELS.customer },
  { value: "diaco", label: SUPPLY_LABELS.diaco },
]

// Accent supply options (used by Section 06 commit) — all three.
const ACCENT_STONE_SUPPLY_OPTIONS: Array<{
  value: StoneSupply
  label: string
}> = [
  { value: "customer", label: SUPPLY_LABELS.customer },
  { value: "diaco", label: SUPPLY_LABELS.diaco },
  { value: "mixed", label: SUPPLY_LABELS.mixed },
]

const COLOR_GRADES: string[] = [
  "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N+",
]
const CLARITY_GRADES: string[] = [
  "FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3",
]
const MAKE_GRADES: string[] = [
  "Excellent", "Very Good", "Good", "Fair", "Poor",
]

const CERT_OPTIONS_BY_CATEGORY: Record<
  StoneTypeOption["category"],
  string[]
> = {
  natural_diamond: ["GIA", "IGI", "HRD", "Other", "None"],
  lab_diamond: ["GIA", "IGI", "GCAL", "Other", "None"],
  color_stone: ["GIA", "CDC", "GRS", "AGL", "Other", "None"],
}

// Resolve a CenterStoneTopType to the actual master row id.
//   natural_diamond → the natural_diamond row's id
//   lab_diamond     → the lab_diamond row's id
//   other           → the "Other" row's id
//   color_stone     → null (sub-pick required)
function topTypeToStoneTypeId(
  topType: CenterStoneTopType | null,
  stoneTypes: StoneTypeOption[],
): string | null {
  if (topType === null) return null
  if (topType === "color_stone") return null
  if (topType === "other") {
    return stoneTypes.find((t) => t.name === "Other")?.id ?? null
  }
  return stoneTypes.find((t) => t.category === topType)?.id ?? null
}

// Color Stone sub-dropdown options: every color_stone master row except
// the "Other" entry (which is its own top-level option).
function colorStoneSubOptions(
  stoneTypes: StoneTypeOption[],
): StoneTypeOption[] {
  return stoneTypes.filter(
    (t) => t.category === "color_stone" && t.name !== "Other",
  )
}

// Is this top-level type a diamond (natural or lab)? Controls case A/B
// vs case C/D rendering.
function isTopTypeDiamond(topType: CenterStoneTopType | null) {
  return topType === "natural_diamond" || topType === "lab_diamond"
}

// Cert dropdown options keyed by top-level type rather than category, so
// "Other" can have its own list if needed (currently empty — we don't
// show cert for case D).
const CERT_OPTIONS_BY_TOP_TYPE: Record<CenterStoneTopType, string[]> = {
  natural_diamond: ["GIA", "IGI", "HRD", "Other", "None"],
  lab_diamond: ["GIA", "IGI", "GCAL", "Other", "None"],
  color_stone: ["GIA", "CDC", "GRS", "AGL", "Other", "None"],
  other: [],
}

// One-line summary used by the collapsed accordion header. Shape:
//   "1.0–1.5ct Round Natural Diamond · Dia-Co supplies"
//   "Other: \"vintage sapphire from grandmother\" · I'll supply"
//   "Not yet filled in"           (when topType is unset)
// The carat range is only shown when both bounds are present; shape and
// supply each drop out when missing. Type name comes from the master
// row when known; otherwise falls back to the top-level label so a
// half-filled Color Stone row still says "Color Stone" rather than
// disappearing.
function centerStoneSummary(
  row: CenterStoneRow,
  stoneTypes: StoneTypeOption[],
  stoneShapes: StoneShapeOption[],
): string {
  if (row.topType === null) return "Not yet filled in"

  const supplyLabel =
    row.supplySource === "customer"
      ? "I'll supply"
      : row.supplySource === "diaco"
        ? "Dia-Co supplies"
        : null

  if (row.topType === "other") {
    const desc = row.customStoneTypeName.trim()
    const stoneDesc = desc ? `Other: "${desc}"` : "Other"
    return supplyLabel ? `${stoneDesc} · ${supplyLabel}` : stoneDesc
  }

  const masterName = row.stoneTypeId
    ? stoneTypes.find((t) => t.id === row.stoneTypeId)?.name
    : null
  const fallbackName =
    row.topType === "natural_diamond"
      ? "Natural Diamond"
      : row.topType === "lab_diamond"
        ? "Lab-Grown Diamond"
        : "Color Stone"
  const typeName = masterName || fallbackName

  const shapeName = row.shapeId
    ? (stoneShapes.find((s) => s.id === row.shapeId)?.name ?? "")
    : ""

  const caratMin = row.caratMin.trim()
  const caratMax = row.caratMax.trim()
  const caratRange =
    caratMin && caratMax ? `${caratMin}–${caratMax}ct` : ""

  const stoneDesc = [caratRange, shapeName, typeName]
    .filter((s) => s.length > 0)
    .join(" ")

  return supplyLabel ? `${stoneDesc} · ${supplyLabel}` : stoneDesc
}

// missingCenterStoneFields + isCenterStoneRowComplete now live in
// submitValidation.ts so the per-row warning icons here and the
// section-header rollup share one rule set. Imported above.

// Project CenterStoneRow[] → RPC payload. Only includes complete rows
// (partial rows live in client state only — same pattern as saveMetals).
function centerStonesToPayload(
  rows: CenterStoneRow[],
): CenterStoneRowPayload[] {
  return rows
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => isCenterStoneRowComplete(r))
    .map(({ r, idx }) => {
      const isDiamond = isTopTypeDiamond(r.topType)
      const isOther = r.topType === "other"
      const isCustomerSupplied = r.supplySource === "customer"
      // Per case: ranges/cert only apply to diamond/color rows with
      // diaco supply. MM only applies to non-other rows with customer
      // supply. Other rows have neither — just description + supply.
      return {
        display_order: idx,
        stone_type_id: r.stoneTypeId!,
        stone_shape_id: isOther ? null : r.shapeId,
        supply_source: r.supplySource!,
        // Carat range: case A (diamond+diaco), case C-diaco (color+diaco). Not B/C-customer/D.
        carat_min:
          !isOther && !isCustomerSupplied ? r.caratMin.trim() || null : null,
        carat_max:
          !isOther && !isCustomerSupplied ? r.caratMax.trim() || null : null,
        // Color/Clarity/Make ranges: case A only (diamond+diaco).
        color_min: isDiamond && !isCustomerSupplied ? r.colorMin : null,
        color_max: isDiamond && !isCustomerSupplied ? r.colorMax : null,
        clarity_min: isDiamond && !isCustomerSupplied ? r.clarityMin : null,
        clarity_max: isDiamond && !isCustomerSupplied ? r.clarityMax : null,
        make_min: isDiamond && !isCustomerSupplied ? r.makeMin : null,
        make_max: isDiamond && !isCustomerSupplied ? r.makeMax : null,
        // Cert: case A or case C-diaco only.
        certification:
          !isOther && !isCustomerSupplied ? r.certification : null,
        // MM dimensions: case B (diamond+customer), case C-customer (color+customer).
        // Never for Other (case D) even with customer supply.
        length_mm:
          !isOther && isCustomerSupplied ? r.lengthMm.trim() || null : null,
        width_mm:
          !isOther && isCustomerSupplied ? r.widthMm.trim() || null : null,
        depth_mm:
          !isOther && isCustomerSupplied ? r.depthMm.trim() || null : null,
        // Free-text description: case D only.
        custom_stone_type_name: isOther
          ? r.customStoneTypeName.trim() || null
          : null,
      }
    })
}

// Helpers for the collapsed summary chip.
function carRangeText(min: string, max: string): string | null {
  const a = min.trim()
  const b = max.trim()
  if (!a && !b) return null
  if (a && b && a === b) return `${a}ct`
  if (a && b) return `${a}–${b}ct`
  if (a) return `${a}ct+`
  return `up to ${b}ct`
}
function gradeRangeText(min: string | null, max: string | null): string | null {
  if (!min && !max) return null
  if (min && max && min === max) return min
  if (min && max) return `${min}–${max}`
  if (min) return `${min}+`
  return `up to ${max!}`
}

function centerStonesSummary(
  gate: HasStones | null,
  rows: CenterStoneRow[],
  stoneTypes: StoneTypeOption[],
  stoneShapes: StoneShapeOption[],
): string | null {
  if (gate === "no") return "No center stones"
  if (gate === "tbd") return "Center stones — to be confirmed"
  if (gate === null) return null

  // gate === 'yes' — only complete rows count for the summary chip.
  const populated = rows.filter(isCenterStoneRowComplete)
  if (populated.length === 0) return null

  const typeName = (id: string | null) =>
    id ? (stoneTypes.find((t) => t.id === id)?.name ?? "—") : "—"
  const shapeName = (id: string | null) =>
    id ? (stoneShapes.find((s) => s.id === id)?.name ?? "—") : ""

  const labelForRow = (r: CenterStoneRow) => {
    if (r.topType === "other") {
      const desc = r.customStoneTypeName.trim()
      return desc ? `Other: ${desc}` : "Other"
    }
    const shape = shapeName(r.shapeId)
    const type = typeName(r.stoneTypeId)
    return shape ? `${shape} ${type}` : type
  }

  if (populated.length === 1) {
    const r = populated[0]
    const isDiamond = isTopTypeDiamond(r.topType)
    const parts: string[] = []
    const carat = carRangeText(r.caratMin, r.caratMax)
    if (carat) parts.push(carat)
    parts.push(labelForRow(r))
    if (isDiamond) {
      const color = gradeRangeText(r.colorMin, r.colorMax)
      const clarity = gradeRangeText(r.clarityMin, r.clarityMax)
      if (color) parts.push(color)
      if (clarity) parts.push(clarity)
    }
    return parts.join(", ")
  }

  if (populated.length === 2) {
    // 2 rows abbreviated, dedupe ×N if labels match.
    const labels = populated.map(labelForRow)
    const counts = new Map<string, number>()
    for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1)
    const parts = Array.from(counts.entries()).map(([l, n]) =>
      n > 1 ? `${l} (×${n})` : l,
    )
    return `2 center stones: ${parts.join(" + ")}`
  }

  // 3 → count only (max is 3 now)
  return `${populated.length} center stones`
}

function anyCustomerSupplied(rows: { supplySource: StoneSupply | null }[]) {
  return rows.some(
    (r) => r.supplySource === "customer" || r.supplySource === "mixed",
  )
}

// ── Section 06 (Accent stones) ────────────────────────────────────

// Color-stone sub-dropdown options for accent rows. Unlike Section 05's
// colorStoneSubOptions (which excludes "Other" because Section 05 has a
// top-level Other branch), Section 06 anchors "Other" as the last item
// of the sub-dropdown — the locked spec has no top-level Other for
// accents. Everything else is sorted alphabetically.
function accentColorStoneSubOptions(
  stoneTypes: StoneTypeOption[],
): StoneTypeOption[] {
  const all = stoneTypes.filter((t) => t.category === "color_stone")
  const others = all.filter((t) => t.name === "Other")
  const named = all
    .filter((t) => t.name !== "Other")
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...named, ...others]
}

// Resolve an accent row's (topType, subType) → stone_types.id.
//   natural_diamond → the natural_diamond master row id
//   lab_diamond     → the lab_diamond master row id
//   color_stone     → subType uuid passes through (it's already an id)
// Parallels topTypeToStoneTypeId from Section 05 but takes a row because
// the sub-pick lives on the row (not a top-level "other" branch).
function accentStoneTypeId(
  row: AccentStoneRow,
  stoneTypes: StoneTypeOption[],
): string | null {
  if (row.topType === null) return null
  if (row.topType === "color_stone") return row.subType
  return stoneTypes.find((t) => t.category === row.topType)?.id ?? null
}

// missingAccentStoneFields + isAccentStoneRowComplete now live in
// submitValidation.ts (canonical home for row validation). Imported
// above.

// Project AccentStoneRow[] → RPC payload. Only complete rows ship — same
// pattern as saveMetals / saveCenterStones. The RPC's per-row shape is
// (display_order, stone_type_id, supply_source); the row's topType is
// purely UI state.
function accentStonesToPayload(
  rows: AccentStoneRow[],
  stoneTypes: StoneTypeOption[],
): AccentStoneRowPayload[] {
  return rows
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => isAccentStoneRowComplete(r))
    .map(({ r, idx }) => {
      // Quality fields only apply to Dia-Co-supplied diamonds. For Lab
      // Diamond + diaco the values are hardcoded defensively — the UI
      // sets them in row state too, but if the UI ever drifts (e.g.,
      // a hot-reload mid-edit clears the auto values) the DB stays
      // consistent. For Natural + diaco we pass through row state.
      // Color stones, Other, customer / mixed: always null.
      const isDiacoSupplied = r.supplySource === "diaco"
      let quality_color: string | null = null
      let quality_clarity: string | null = null
      if (isDiacoSupplied && r.topType === "lab_diamond") {
        quality_color = LAB_DIAMOND_AUTO_COLOR
        quality_clarity = LAB_DIAMOND_AUTO_CLARITY
      } else if (isDiacoSupplied && r.topType === "natural_diamond") {
        quality_color = r.qualityColor
        quality_clarity = r.qualityClarity
      }
      return {
        display_order: idx,
        stone_type_id: accentStoneTypeId(r, stoneTypes)!,
        supply_source: r.supplySource!,
        quality_color,
        quality_clarity,
      }
    })
}

// Per-row summary text used by the collapsed accordion head. Shape:
//   "Natural Diamond · Dia-Co supplies · F/G · VS2"
//   "Lab-Grown Diamond · Dia-Co supplies · E/F · VVS"
//   "Sapphire · I'll supply"
//   "Other (color stone) · Mixed — some of each"
//   "Not yet filled in"           (when topType is unset)
// Falls back to the top-level label when the master row name isn't
// resolvable yet (e.g. color_stone with sub-pick pending).
//
// Quality (color · clarity) appended only for diamond + diaco rows.
// Partial-state: color null → omit both (defensive, even if clarity
// happens to be set); color set + clarity null → color only.
function accentStoneSummary(
  row: AccentStoneRow,
  stoneTypes: StoneTypeOption[],
): string {
  if (row.topType === null) return "Not yet filled in"

  const supplyLabel = row.supplySource
    ? SUPPLY_LABELS[row.supplySource]
    : null

  let typeName: string
  if (row.topType === "color_stone") {
    const sub = row.subType
      ? stoneTypes.find((t) => t.id === row.subType)?.name
      : null
    typeName = sub ?? "Color Stone"
  } else {
    const masterName = stoneTypes.find((t) => t.category === row.topType)?.name
    typeName =
      masterName ??
      (row.topType === "natural_diamond" ? "Natural Diamond" : "Lab-Grown Diamond")
  }

  const base = supplyLabel ? `${typeName} · ${supplyLabel}` : typeName

  // Quality tail: diamond + diaco only. Color null gates the whole tail
  // (so a defensive clarity-without-color state contributes nothing).
  const isDiamond =
    row.topType === "natural_diamond" || row.topType === "lab_diamond"
  if (isDiamond && row.supplySource === "diaco" && row.qualityColor) {
    return row.qualityClarity
      ? `${base} · ${row.qualityColor} · ${row.qualityClarity}`
      : `${base} · ${row.qualityColor}`
  }
  return base
}

// Section-level summary chip used by the collapsed Section 06 header.
// Rules per locked spec (PROJECT_CONTEXT §15 / Step 5 spec):
//   gate=no  → "No accent stones"
//   gate=tbd → "Accent stones — to be confirmed"
//   gate=yes, 0 complete rows → null (no chip until at least one is filled)
//   gate=yes, 1–3 distinct types → "Accent Stones: A + B + C" with master
//                                  row names pluralized; same-type rows
//                                  dedupe to "Name ×N"
//   gate=yes, 4+ distinct types → "Accent Stones: N types"
// Pluralization: append "s" verbatim. "Other" is left singular. The
// locked spec accepts "Blue Topazes" / "Lab-Grown Diamonds" as fine.
function pluralizeAccentType(name: string): string {
  if (name === "Other") return name
  return `${name}s`
}

function accentStonesSummary(
  gate: HasStones | null,
  rows: AccentStoneRow[],
  stoneTypes: StoneTypeOption[],
): string | null {
  if (gate === "no") return "No accent stones"
  if (gate === "tbd") return "Accent stones — to be confirmed"
  if (gate === null) return null

  const populated = rows.filter(isAccentStoneRowComplete)
  if (populated.length === 0) return null

  // Resolve each row to its master-row name. Preserve insertion order
  // (first-seen wins) so the chip reads in the order the customer added
  // them — matches the visual order of the row list.
  const counts = new Map<string, number>()
  for (const r of populated) {
    const id = accentStoneTypeId(r, stoneTypes)
    const name = id
      ? (stoneTypes.find((t) => t.id === id)?.name ?? "—")
      : "—"
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const distinctCount = counts.size
  if (distinctCount >= 4) {
    return `Accent Stones: ${distinctCount} types`
  }

  const parts = Array.from(counts.entries()).map(([name, n]) => {
    const plural = pluralizeAccentType(name)
    return n > 1 ? `${plural} ×${n}` : plural
  })
  return `Accent Stones: ${parts.join(" + ")}`
}

// ── Phone mask (formats as "(555) 123-4567" while typing) ─────────
// We store the formatted string in ship_to_phone, matching the existing
// seed convention (DG-10001's "(503) 555-0142" etc.).
// Submit validation (Phase 2B Step 6) will assert 10 digits when
// shipping_method ∈ {different_address, drop_ship}.
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  if (digits.length === 0) return ""
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6)
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ── ZIP validation ────────────────────────────────────────────────
// 5-digit US ZIP only for Phase 2B. Submit validator (Step 6) will
// enforce this server-side when country=US AND shipping_method ∈
// {different_address, drop_ship}. Inline error shown only when
// non-empty AND invalid (empty fields are submit-time concerns).
const ZIP_REGEX = /^\d{5}$/
function isInvalidZip(value: string): boolean {
  return value.length > 0 && !ZIP_REGEX.test(value)
}

// Shipping mode card content.
const SHIPPING_METHODS: Array<{
  key: ShippingMethod
  label: string
  help: string
}> = [
  {
    key: "standard",
    label: "Ship to my account address",
    help: "Use your default Dia-Co account address. Fastest — nothing to fill in.",
  },
  {
    key: "different_address",
    label: "Ship to a different address",
    help: "Send this order somewhere other than your account address.",
  },
  {
    key: "drop_ship",
    label: "Drop ship to my end customer",
    help: "We ship straight to the end customer. No Dia-Co branding on the package.",
  },
]

function shippingSummary(f: FormFields): string | null {
  if (!f.shippingMethod) return null
  if (f.shippingMethod === "standard") return "Ship to my account address"
  const label =
    f.shippingMethod === "drop_ship"
      ? "Drop ship"
      : "Different address"
  const cityState =
    f.shipToCity && f.shipToState
      ? `${f.shipToCity}, ${f.shipToState}`
      : f.shipToCity || f.shipToState || null
  const recipient = f.shipToRecipientName.trim() || null
  const parts = [label, recipient, cityState].filter(Boolean)
  return parts.length > 1 ? parts.join(" · ") : `${label} — not yet entered`
}

function engravingSummary(f: FormFields): string | null {
  const parts: string[] = []
  if (f.engravingUseLogo) {
    parts.push(
      f.engravingLogoPosition
        ? `My logo · ${ENGRAVING_POSITION_LABEL[f.engravingLogoPosition]}`
        : "My logo",
    )
  }
  if (f.engravingText.trim()) {
    const excerpt = f.engravingText.trim().slice(0, 30)
    const truncated = excerpt.length < f.engravingText.trim().length
    const textPart = `"${excerpt}${truncated ? "…" : ""}"`
    parts.push(
      f.engravingTextPosition
        ? `${textPart} · ${ENGRAVING_POSITION_LABEL[f.engravingTextPosition]}`
        : textPart,
    )
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

// Project FormFields → DraftFields (server-action payload shape).
function toDraftFields(f: FormFields): DraftFields {
  return {
    client_po: f.clientPo || null,
    end_customer_name: f.endCustomerName || null,
    product_type_short_code: f.productTypeShortCode,
    quantity: f.quantity > 0 ? f.quantity : null,
    size_spec: f.sizeSpec || null,
    finish_point: f.finishPoint,
    description: f.description || null,
    submission_notes: f.submissionNotes || null,
    engraving_text: f.engravingText || null,
    engraving_use_logo: f.engravingUseLogo,
    engraving_logo_position: f.engravingLogoPosition,
    engraving_text_position: f.engravingTextPosition,
    // Shipping. When the customer picks "standard", we explicitly null out
    // any ship_to_* fields they might have entered before switching back —
    // standard means "use my account address", which lives on the customer
    // record, not the order. AM resolves it at ship time.
    shipping_method: f.shippingMethod,
    ship_to_recipient_name:
      f.shippingMethod === "standard" ? null : f.shipToRecipientName || null,
    ship_to_address_line1:
      f.shippingMethod === "standard" ? null : f.shipToAddressLine1 || null,
    ship_to_address_line2:
      f.shippingMethod === "standard" ? null : f.shipToAddressLine2 || null,
    ship_to_city: f.shippingMethod === "standard" ? null : f.shipToCity || null,
    ship_to_state:
      f.shippingMethod === "standard" ? null : f.shipToState || null,
    ship_to_postal_code:
      f.shippingMethod === "standard" ? null : f.shipToPostalCode || null,
    ship_to_country:
      f.shippingMethod === "standard" ? null : f.shipToCountry || null,
    ship_to_phone:
      f.shippingMethod === "standard" ? null : f.shipToPhone || null,
    has_center_stones: f.hasCenterStones,
    has_accent_stones: f.hasAccentStones,
  }
}

// Project FormFields → ValidationInput (submitValidation's narrower
// view). Structural subtyping handles f.metals: MetalRow[] satisfies
// MetalRowValidation[] because MetalRow has metal_id (the only field
// MetalRowValidation reads).
function toValidationInput(f: FormFields): ValidationInput {
  return {
    clientPo: f.clientPo,
    endCustomerName: f.endCustomerName,
    productTypeShortCode: f.productTypeShortCode,
    sizeSpec: f.sizeSpec,
    finishPoint: f.finishPoint,
    description: f.description,
    engravingText: f.engravingText,
    engravingUseLogo: f.engravingUseLogo,
    engravingLogoPosition: f.engravingLogoPosition,
    engravingTextPosition: f.engravingTextPosition,
    shippingMethod: f.shippingMethod,
    shipToRecipientName: f.shipToRecipientName,
    shipToAddressLine1: f.shipToAddressLine1,
    shipToCity: f.shipToCity,
    shipToState: f.shipToState,
    shipToPostalCode: f.shipToPostalCode,
    shipToCountry: f.shipToCountry,
    shipToPhone: f.shipToPhone,
    metals: f.metals,
    hasCenterStones: f.hasCenterStones,
    centerStones: f.centerStones,
    hasAccentStones: f.hasAccentStones,
    accentStones: f.accentStones,
  }
}

// ─── Main component ──────────────────────────────────────────────────

export function NewOrderForm({
  customerId,
  productTypes,
  customer,
  metals: metalOptions,
  stoneTypes,
  stoneShapes,
  initialDraft,
}: NewOrderFormProps) {
  const router = useRouter()

  // Step 7 — resume hydration. When initialDraft is present, every
  // form-state useState seeds from it; otherwise defaults apply.
  // Autosave stays event-driven (no useEffect mutates form state on
  // mount) so the first scheduled save fires on the customer's first
  // change, not on resume. Verified empirically during smoke test.
  const [fields, setFields] = useState<FormFields>(
    initialDraft?.formFields ?? INITIAL_FIELDS,
  )
  const [draftId, setDraftId] = useState<string | null>(
    initialDraft?.draftId ?? null,
  )
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [openSections, setOpenSections] = useState<Set<number>>(
    new Set(DEFAULT_OPEN),
  )
  const [discardConfirming, setDiscardConfirming] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  // Step 6 — submit pipeline state.
  // highestSectionTouched: drives the section-header warning rollup.
  //   A section warns only when sectionId < highestSectionTouched.
  //   Resume seeds from inferred max-filled section; brand-new form
  //   starts at 1 (Section 01 only).
  const [highestSectionTouched, setHighestSectionTouched] = useState<number>(
    initialDraft?.highestSectionTouched ?? 1,
  )
  // Submit-in-flight + inline error for the sticky footer.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Debounce timer + an in-flight ref so we don't race ourselves.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Section 04 has its own debounce, independent of saveDraft.
  const metalsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Section 05 has its own debounce — fires independently of all others.
  const centerStonesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  // Section 06 — same pattern as 05, separate timer.
  const accentStonesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  // Per-row "touched" tracking for area inputs — errors only render after blur.
  // On resume, length matches the hydrated metals array; all-false is fine
  // since "touched" is a UI-only blur signal that the customer will re-trigger
  // by interacting with the field.
  const [metalAreaTouched, setMetalAreaTouched] = useState<boolean[]>(
    () =>
      Array(initialDraft?.formFields.metals.length ?? 1).fill(false) as boolean[],
  )
  // Accordion: which center stone row is expanded, or null when all
  // collapsed / no rows. Pure UI state — not persisted. Invariants:
  //   - At most one row expanded at a time
  //   - On add: new row is expanded (collapses any other)
  //   - On remove: if the removed row was expanded, the row above takes
  //     its place (or null if the list becomes empty)
  //   - Cleared whenever the section is hidden (gate ≠ yes, product type
  //     loses center stones, finish point downgrades)
  const [expandedCenterStoneIndex, setExpandedCenterStoneIndex] = useState<
    number | null
  >(initialDraft?.expandedCenterStoneIndex ?? null)
  // Section 06 accordion — separate index from Section 05 since the two
  // sections can be open simultaneously. Same invariants as
  // expandedCenterStoneIndex (one at a time, cleared on hide).
  const [expandedAccentStoneIndex, setExpandedAccentStoneIndex] = useState<
    number | null
  >(initialDraft?.expandedAccentStoneIndex ?? null)
  // Latest draftId — captured into the closure of fired saves so the timer
  // sees the current value even if the React state hasn't propagated yet.
  const draftIdRef = useRef<string | null>(null)
  draftIdRef.current = draftId

  // Tick the "saved Xs ago" indicator periodically so it doesn't stale.
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!lastSavedAt) return
    const id = setInterval(() => forceTick((n) => n + 1), 15_000)
    return () => clearInterval(id)
  }, [lastSavedAt])

  // ─── Save / autosave ──────────────────────────────────────────────

  const runSave = useCallback(
    async (snapshot: FormFields) => {
      setSaveStatus("saving")
      const result = await saveDraft({
        draftId: draftIdRef.current,
        customerId,
        fields: toDraftFields(snapshot),
      })
      if (result.ok && result.id) {
        if (!draftIdRef.current) {
          // First save — promote insert id into state for subsequent updates.
          setDraftId(result.id)
          draftIdRef.current = result.id
        }
        setSaveStatus("saved")
        setLastSavedAt(result.updatedAt ? new Date(result.updatedAt) : new Date())
      } else {
        setSaveStatus("error")
        console.error("saveDraft failed:", result.error)
      }
    },
    [customerId],
  )

  const scheduleSave = useCallback(
    (snapshot: FormFields) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => runSave(snapshot), DEBOUNCE_MS)
    },
    [runSave],
  )

  // Generic setter: updates state and re-arms the debounced save.
  const setField = useCallback(
    <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
      setFields((prev) => {
        const next = { ...prev, [key]: value }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  // ─── Section 05 save scheduler ───
  // Declared early because setProductType + setFinishPoint reference
  // scheduleSaveCenterStones in their cleanup paths.

  const runSaveCenterStones = useCallback(
    async (snapshot: CenterStoneRow[]) => {
      if (!draftIdRef.current) return // no draft yet; next save after first INSERT will retry
      setSaveStatus("saving")
      const result = await saveCenterStones({
        orderId: draftIdRef.current,
        rows: centerStonesToPayload(snapshot),
      })
      if (result.ok) {
        setSaveStatus("saved")
        setLastSavedAt(new Date())
      } else {
        setSaveStatus("error")
        console.error("saveCenterStones failed:", result.error)
      }
    },
    [],
  )

  const scheduleSaveCenterStones = useCallback(
    (snapshot: CenterStoneRow[]) => {
      if (centerStonesDebounceRef.current)
        clearTimeout(centerStonesDebounceRef.current)
      centerStonesDebounceRef.current = setTimeout(
        () => runSaveCenterStones(snapshot),
        DEBOUNCE_MS,
      )
    },
    [runSaveCenterStones],
  )

  // ─── Section 06 save scheduler ───
  // Parallels Section 05's runSave/schedule pair. Same draft-id guard,
  // same incomplete-row filter, independent timer.

  const runSaveAccentStones = useCallback(
    async (snapshot: AccentStoneRow[]) => {
      if (!draftIdRef.current) return // no draft yet; next save retries
      setSaveStatus("saving")
      const result = await saveAccentStones({
        orderId: draftIdRef.current,
        rows: accentStonesToPayload(snapshot, stoneTypes),
      })
      if (result.ok) {
        setSaveStatus("saved")
        setLastSavedAt(new Date())
      } else {
        setSaveStatus("error")
        console.error("saveAccentStones failed:", result.error)
      }
    },
    [stoneTypes],
  )

  const scheduleSaveAccentStones = useCallback(
    (snapshot: AccentStoneRow[]) => {
      if (accentStonesDebounceRef.current)
        clearTimeout(accentStonesDebounceRef.current)
      accentStonesDebounceRef.current = setTimeout(
        () => runSaveAccentStones(snapshot),
        DEBOUNCE_MS,
      )
    },
    [runSaveAccentStones],
  )

  // Product-type changes clear two kinds of stale data:
  //   1. Engraving positions whose option set differs across product types
  //   2. Center stones when the new product type doesn't allow them
  //      (bracelet, locks, charm, cufflinks all hide Section 05)
  const setProductType = useCallback(
    (shortCode: string) => {
      setFields((prev) => {
        const validOptions = positionOptionsFor(shortCode)
        const next: FormFields = {
          ...prev,
          productTypeShortCode: shortCode,
          engravingLogoPosition:
            prev.engravingLogoPosition &&
            validOptions.includes(prev.engravingLogoPosition)
              ? prev.engravingLogoPosition
              : null,
          engravingTextPosition:
            prev.engravingTextPosition &&
            validOptions.includes(prev.engravingTextPosition)
              ? prev.engravingTextPosition
              : null,
        }
        // Section 05 visibility check. If the new product type doesn't
        // allow center stones, wipe gate + rows. The save scheduler will
        // pick up the empty rows on the next tick.
        const allowsCenters = PRODUCT_TYPES_WITH_CENTER_STONES.has(shortCode)
        if (!allowsCenters) {
          // Section 05 vanished — clear gate, rows, and expansion atomically.
          if (
            prev.hasCenterStones !== null ||
            prev.centerStones.length > 0
          ) {
            next.hasCenterStones = null
            next.centerStones = []
            scheduleSaveCenterStones([])
          }
          setExpandedCenterStoneIndex(null)
        }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave, scheduleSaveCenterStones],
  )

  // Finish-point changes also can hide Section 05 + Section 06 (when
  // downgrading from 'finished_piece' to anything else). Both sections
  // share the same visibility cliff at finished_piece, so the cleanup
  // runs together. Section 06 has no product-type-driven cleanup — it
  // shows for all 9 product types.
  const setFinishPoint = useCallback(
    (value: FinishPoint | null) => {
      setFields((prev) => {
        const next: FormFields = { ...prev, finishPoint: value }
        const sectionVisible = value === "finished_piece"
        if (!sectionVisible) {
          if (
            prev.hasCenterStones !== null ||
            prev.centerStones.length > 0
          ) {
            next.hasCenterStones = null
            next.centerStones = []
            scheduleSaveCenterStones([])
          }
          setExpandedCenterStoneIndex(null)
          if (
            prev.hasAccentStones !== null ||
            prev.accentStones.length > 0
          ) {
            next.hasAccentStones = null
            next.accentStones = []
            scheduleSaveAccentStones([])
          }
          setExpandedAccentStoneIndex(null)
        }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave, scheduleSaveCenterStones, scheduleSaveAccentStones],
  )

  // Flush any pending debounced save synchronously. The three sibling
  // flush helpers (flushSaveMetals/CenterStones/AccentStones) live
  // further down — declared after their respective runSave* functions
  // to avoid temporal-dead-zone references in the useCallback deps.
  const flushSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      await runSave(fields)
    }
  }, [runSave, fields])

  // ─── Section 04 (Metal) — independent save action ──────────────────

  const runSaveMetals = useCallback(
    async (snapshot: MetalRow[]) => {
      // Need a draftId to write child rows against.
      if (!draftIdRef.current) {
        // No draft yet — saveDraft hasn't fired its first INSERT. The next
        // metals change after the draft exists will re-arm and try again.
        return
      }
      setSaveStatus("saving")
      const result = await saveMetals({
        orderId: draftIdRef.current,
        rows: metalsToPayload(snapshot),
      })
      if (result.ok) {
        setSaveStatus("saved")
        setLastSavedAt(new Date())
      } else {
        setSaveStatus("error")
        console.error("saveMetals failed:", result.error)
      }
    },
    [],
  )

  const scheduleSaveMetals = useCallback(
    (snapshot: MetalRow[]) => {
      // Cancel any pending save; the latest change wins.
      if (metalsDebounceRef.current) clearTimeout(metalsDebounceRef.current)
      // Validate before scheduling — never autosave a section with errors.
      const { sectionValid } = validateMetals(snapshot)
      if (!sectionValid) return
      metalsDebounceRef.current = setTimeout(
        () => runSaveMetals(snapshot),
        DEBOUNCE_MS,
      )
    },
    [runSaveMetals],
  )

  // Update a single field on a single metal row.
  // If the customer changes metal_id away from Silver and the row currently
  // has 'antiqued' selected, clear the finish — mirror the defensive pattern
  // used when product_type changes affect engraving position options.
  const updateMetalRow = useCallback(
    <K extends keyof MetalRow>(index: number, key: K, value: MetalRow[K]) => {
      setFields((prev) => {
        const nextMetals = prev.metals.map((r, i) => {
          if (i !== index) return r
          const merged = { ...r, [key]: value }
          if (
            key === "metal_id" &&
            merged.finish === "antiqued" &&
            !isSilverMetal(merged.metal_id, metalOptions)
          ) {
            merged.finish = null
          }
          return merged
        })
        const next = { ...prev, metals: nextMetals }
        scheduleSaveMetals(nextMetals)
        return next
      })
    },
    [scheduleSaveMetals, metalOptions],
  )

  const addMetalRow = useCallback(() => {
    setFields((prev) => {
      if (prev.metals.length >= MAX_METAL_ROWS) return prev
      const nextMetals = [...prev.metals, { ...EMPTY_METAL_ROW }]
      const next = { ...prev, metals: nextMetals }
      scheduleSaveMetals(nextMetals)
      return next
    })
    setMetalAreaTouched((prev) => [...prev, false])
  }, [scheduleSaveMetals])

  const removeMetalRow = useCallback(
    (index: number) => {
      setFields((prev) => {
        if (prev.metals.length <= 1) return prev
        const nextMetals = prev.metals.filter((_, i) => i !== index)
        const next = { ...prev, metals: nextMetals }
        scheduleSaveMetals(nextMetals)
        return next
      })
      setMetalAreaTouched((prev) => prev.filter((_, i) => i !== index))
    },
    [scheduleSaveMetals],
  )

  const markMetalAreaTouched = useCallback((index: number) => {
    setMetalAreaTouched((prev) => {
      if (prev[index]) return prev
      const next = [...prev]
      next[index] = true
      return next
    })
  }, [])

  // ─── Pre-submit flush helpers ──────────────────────────────────────
  // Parallel to flushSave above, but for the three section-specific
  // debounces. Each cancels its timer (if pending) and runs the save
  // synchronously against the current snapshot. handleSubmit drains
  // all four before flipping status — without this, a customer who
  // clicks Submit within the 1000ms debounce window risks racing the
  // status flip against their latest in-flight changes.
  //
  // Declared here (post-runSaveMetals) so the dep array reference
  // doesn't hit the temporal dead zone. The three are grouped for
  // findability; flushSave stays near its scheduleSave/runSave pair.

  const flushSaveMetals = useCallback(async () => {
    if (metalsDebounceRef.current) {
      clearTimeout(metalsDebounceRef.current)
      metalsDebounceRef.current = null
      await runSaveMetals(fields.metals)
    }
  }, [runSaveMetals, fields.metals])

  const flushSaveCenterStones = useCallback(async () => {
    if (centerStonesDebounceRef.current) {
      clearTimeout(centerStonesDebounceRef.current)
      centerStonesDebounceRef.current = null
      await runSaveCenterStones(fields.centerStones)
    }
  }, [runSaveCenterStones, fields.centerStones])

  const flushSaveAccentStones = useCallback(async () => {
    if (accentStonesDebounceRef.current) {
      clearTimeout(accentStonesDebounceRef.current)
      accentStonesDebounceRef.current = null
      await runSaveAccentStones(fields.accentStones)
    }
  }, [runSaveAccentStones, fields.accentStones])

  // ─── Section 05 (Center stones) — independent save action ─────────

  const updateCenterStoneRow = useCallback(
    <K extends keyof CenterStoneRow>(
      index: number,
      key: K,
      value: CenterStoneRow[K],
    ) => {
      setFields((prev) => {
        const nextStones = prev.centerStones.map((r, i) => {
          if (i !== index) return r
          let merged: CenterStoneRow = { ...r, [key]: value }

          // ─── topType transition ─────────────────────────────────
          // Picking a top-level type resolves stoneTypeId (or clears
          // it for color_stone pending sub-pick) and clears fields
          // that don't apply to the new case.
          if (key === "topType") {
            const newTop = merged.topType
            merged.stoneTypeId = topTypeToStoneTypeId(newTop, stoneTypes)
            if (newTop === "other") {
              // Case D: no shape, no ranges, no cert, no MM.
              merged.shapeId = null
              merged.caratMin = ""
              merged.caratMax = ""
              merged.colorMin = null
              merged.colorMax = null
              merged.clarityMin = null
              merged.clarityMax = null
              merged.makeMin = null
              merged.makeMax = null
              merged.certification = null
              merged.lengthMm = ""
              merged.widthMm = ""
              merged.depthMm = ""
            } else {
              // Non-other: clear free-text description; it only applies
              // to Other.
              merged.customStoneTypeName = ""
              // Color stone path: clear diamond-only grades.
              if (newTop === "color_stone") {
                merged.colorMin = null
                merged.colorMax = null
                merged.clarityMin = null
                merged.clarityMax = null
                merged.makeMin = null
                merged.makeMax = null
              }
              // Cert options differ by top type; filter the array to
              // keep only values still in the new allowed list. If
              // nothing survives, null out (matches the "empty = null"
              // convention used by the multi-select handler).
              if (newTop && merged.certification) {
                const allowed = CERT_OPTIONS_BY_TOP_TYPE[newTop]
                const filtered = merged.certification.filter((c) =>
                  allowed.includes(c),
                )
                merged.certification = filtered.length > 0 ? filtered : null
              }
            }
          }

          // ─── supplySource transition ────────────────────────────
          // I'll supply → MM applies, ranges/cert don't.
          // Dia-Co supplies → ranges/cert apply, MM doesn't.
          if (key === "supplySource") {
            if (merged.supplySource === "customer") {
              merged.caratMin = ""
              merged.caratMax = ""
              merged.colorMin = null
              merged.colorMax = null
              merged.clarityMin = null
              merged.clarityMax = null
              merged.makeMin = null
              merged.makeMax = null
              merged.certification = null
            } else if (merged.supplySource === "diaco") {
              merged.lengthMm = ""
              merged.widthMm = ""
              merged.depthMm = ""
            }
          }

          return merged
        })
        const next = { ...prev, centerStones: nextStones }
        scheduleSaveCenterStones(nextStones)
        return next
      })
    },
    [scheduleSaveCenterStones, stoneTypes],
  )

  const addCenterStoneRow = useCallback(() => {
    // Call setExpandedCenterStoneIndex INSIDE the updater so it's atomic
    // with the row append. Originally a flag was set inside the updater
    // and the expansion setter was called outside it — but under
    // concurrent rendering the updater can run after the surrounding
    // synchronous code, leaving the flag false and skipping the
    // expansion setter (which caused new rows to appear collapsed).
    // Pairing the two setters keeps them in lock-step. StrictMode may
    // invoke the updater twice; both invocations compute identical
    // values so the inner setExpandedCenterStoneIndex is idempotent.
    setFields((prev) => {
      if (prev.centerStones.length >= MAX_CENTER_STONE_ROWS) return prev
      const nextStones = [...prev.centerStones, { ...EMPTY_CENTER_STONE_ROW }]
      scheduleSaveCenterStones(nextStones)
      setExpandedCenterStoneIndex(nextStones.length - 1)
      return { ...prev, centerStones: nextStones }
    })
  }, [scheduleSaveCenterStones])

  const removeCenterStoneRow = useCallback(
    (index: number) => {
      // Expansion adjustment runs inside the row updater (see comment on
      // addCenterStoneRow) so it's atomic with the row removal.
      // Adjustment rules:
      //   - list is empty       → null
      //   - removed below open  → shift open down by 1
      //   - removed the open    → open the row above (clamped to 0)
      //   - removed above open  → no change
      setFields((prev) => {
        if (prev.centerStones.length === 0) return prev
        const nextStones = prev.centerStones.filter((_, i) => i !== index)
        scheduleSaveCenterStones(nextStones)
        setExpandedCenterStoneIndex((prevIdx) => {
          if (nextStones.length === 0) return null
          if (prevIdx === null) return null
          if (index < prevIdx) return prevIdx - 1
          if (index === prevIdx) return Math.max(0, prevIdx - 1)
          return prevIdx
        })
        return { ...prev, centerStones: nextStones }
      })
    },
    [scheduleSaveCenterStones],
  )

  // Accordion toggle. Clicking an already-open row collapses it (sets
  // null); clicking a different row swaps which one is open.
  const toggleExpandCenterStone = useCallback((index: number) => {
    setExpandedCenterStoneIndex((prev) => (prev === index ? null : index))
  }, [])

  // Gate setter — writes orders.has_center_stones via saveDraft AND clears
  // the rows array when the customer says no/tbd (server then sees empty
  // rows and the RPC deletes any existing stone rows for this order).
  const setHasCenterStones = useCallback(
    (value: HasStones | null) => {
      // Both branches keep the row mutation and expansion setter in the
      // same updater so they commit together — same reasoning as
      // addCenterStoneRow.
      setFields((prev) => {
        const next: FormFields = { ...prev, hasCenterStones: value }
        if (value !== "yes") {
          // No / TBD / unset → drop rows + collapse.
          if (prev.centerStones.length > 0) {
            next.centerStones = []
            scheduleSaveCenterStones([])
          }
          setExpandedCenterStoneIndex(null)
        } else if (prev.centerStones.length === 0) {
          // Yes + no rows yet → auto-create row 1 and open it expanded
          // so the customer can start filling immediately.
          next.centerStones = [{ ...EMPTY_CENTER_STONE_ROW }]
          scheduleSaveCenterStones(next.centerStones)
          setExpandedCenterStoneIndex(0)
        }
        // Yes + existing rows (resuming a draft, or re-clicking Yes) →
        // leave rows + expansion untouched.
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave, scheduleSaveCenterStones],
  )

  // ─── Section 06 (Accent stones) — independent save action ─────────
  // Mirrors Section 05's update/add/remove/toggle/gate setters but with
  // the simpler 2-field row. Stale-data clearing: switching topType
  // away from color_stone drops the orphan subType; supplySource is
  // preserved across topType switches per the locked spec.

  const updateAccentStoneRow = useCallback(
    <K extends keyof AccentStoneRow>(
      index: number,
      key: K,
      value: AccentStoneRow[K],
    ) => {
      setFields((prev) => {
        const nextStones = prev.accentStones.map((r, i) => {
          if (i !== index) return r
          const merged: AccentStoneRow = { ...r, [key]: value }

          // ─── topType transition ─────────────────────────────────
          // Drop orphan subType when leaving color_stone. Re-seed
          // quality based on the new top type:
          //   lab_diamond   → auto-set when currently diaco-supplied
          //   natural       → clear (fresh slate; customer picks)
          //   color_stone   → clear (no quality fields apply)
          //   null          → clear
          if (key === "topType") {
            if (merged.topType !== "color_stone") {
              merged.subType = null
            }
            if (
              merged.topType === "lab_diamond" &&
              merged.supplySource === "diaco"
            ) {
              merged.qualityColor = LAB_DIAMOND_AUTO_COLOR
              merged.qualityClarity = LAB_DIAMOND_AUTO_CLARITY
            } else {
              merged.qualityColor = null
              merged.qualityClarity = null
            }
          }

          // ─── supplySource transition ────────────────────────────
          //   customer / mixed   → clear quality (none apply)
          //   diaco + lab        → auto-set
          //   diaco + natural    → FRESH SLATE (clear); the customer
          //                        never saw the picker while in the
          //                        non-diaco state, so there's no
          //                        meaningful prior intent to preserve
          //   diaco + color/null → clear (no quality applies)
          if (key === "supplySource") {
            if (
              merged.supplySource === "customer" ||
              merged.supplySource === "mixed"
            ) {
              merged.qualityColor = null
              merged.qualityClarity = null
            } else if (merged.supplySource === "diaco") {
              if (merged.topType === "lab_diamond") {
                merged.qualityColor = LAB_DIAMOND_AUTO_COLOR
                merged.qualityClarity = LAB_DIAMOND_AUTO_CLARITY
              } else {
                // natural_diamond, color_stone, null → fresh slate
                merged.qualityColor = null
                merged.qualityClarity = null
              }
            }
          }

          // ─── qualityColor transition ────────────────────────────
          // Stale-data: changing Color invalidates the Clarity pick
          // (the allowed clarity set is filtered by color tier).
          if (key === "qualityColor") {
            merged.qualityClarity = null
          }

          return merged
        })
        const next = { ...prev, accentStones: nextStones }
        scheduleSaveAccentStones(nextStones)
        return next
      })
    },
    [scheduleSaveAccentStones],
  )

  const addAccentStoneRow = useCallback(() => {
    // Atomic with the expansion setter — see addCenterStoneRow's comment
    // for the StrictMode reasoning.
    setFields((prev) => {
      if (prev.accentStones.length >= MAX_ACCENT_STONE_ROWS) return prev
      const nextStones = [...prev.accentStones, { ...EMPTY_ACCENT_STONE_ROW }]
      scheduleSaveAccentStones(nextStones)
      setExpandedAccentStoneIndex(nextStones.length - 1)
      return { ...prev, accentStones: nextStones }
    })
  }, [scheduleSaveAccentStones])

  const removeAccentStoneRow = useCallback(
    (index: number) => {
      setFields((prev) => {
        if (prev.accentStones.length === 0) return prev
        const nextStones = prev.accentStones.filter((_, i) => i !== index)
        scheduleSaveAccentStones(nextStones)
        setExpandedAccentStoneIndex((prevIdx) => {
          if (nextStones.length === 0) return null
          if (prevIdx === null) return null
          if (index < prevIdx) return prevIdx - 1
          if (index === prevIdx) return Math.max(0, prevIdx - 1)
          return prevIdx
        })
        return { ...prev, accentStones: nextStones }
      })
    },
    [scheduleSaveAccentStones],
  )

  const toggleExpandAccentStone = useCallback((index: number) => {
    setExpandedAccentStoneIndex((prev) => (prev === index ? null : index))
  }, [])

  const setHasAccentStones = useCallback(
    (value: HasStones | null) => {
      setFields((prev) => {
        const next: FormFields = { ...prev, hasAccentStones: value }
        if (value !== "yes") {
          if (prev.accentStones.length > 0) {
            next.accentStones = []
            scheduleSaveAccentStones([])
          }
          setExpandedAccentStoneIndex(null)
        } else if (prev.accentStones.length === 0) {
          next.accentStones = [{ ...EMPTY_ACCENT_STONE_ROW }]
          scheduleSaveAccentStones(next.accentStones)
          setExpandedAccentStoneIndex(0)
        }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave, scheduleSaveAccentStones],
  )

  // ─── Section open/close + touched tracking ────────────────────────

  // Bump "highest section the customer has interacted with" — the
  // §18 "moved past" trigger. Called from toggleSection AND from the
  // Section component's onClickCapture/onChangeCapture on its body,
  // so any descendant interaction trips earlier sections' warnings.
  // Monotonic: never decreases (warnings stay active once tripped).
  const touchSection = useCallback((id: number) => {
    setHighestSectionTouched((prev) => (id > prev ? id : prev))
  }, [])

  const toggleSection = (id: number) => {
    touchSection(id)
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Conditional visibility ───────────────────────────────────────

  const showMetal =
    fields.finishPoint != null &&
    !["file", "wax"].includes(fields.finishPoint)
  // Stones section visibility — split because they differ by product type.
  // Section 05 (Center) shown for ring/pendant/earring/necklace/other at
  // finished_piece. Section 06 (Accent) shown for ALL 9 product types at
  // finished_piece. Bracelet/locks/charm/cufflinks hide Section 05.
  const productAllowsCenters =
    fields.productTypeShortCode != null &&
    PRODUCT_TYPES_WITH_CENTER_STONES.has(fields.productTypeShortCode)
  const showCenterStones =
    fields.finishPoint === "finished_piece" && productAllowsCenters
  const showAccentStones = fields.finishPoint === "finished_piece"
  // Engraving requires metal in hand — only the two finish points that
  // hand the customer a polished surface or a complete piece.
  const showEngraving =
    fields.finishPoint === "polished_mounting" ||
    fields.finishPoint === "finished_piece"

  // ─── Submit validation ────────────────────────────────────────────
  // Called every render. Pure, sub-millisecond at form scale. Drives:
  //   - Submit button's disabled state (validation.isSubmittable)
  //   - Each Section's warningFields prop (gated by highestSectionTouched)
  // No memoization yet per locked decision; revisit if perf shows.
  const validation = validateForSubmit(toValidationInput(fields))

  // ─── Submit error clear effect ───────────────────────────────────
  // Spec rule: submitError clears on any field interaction. Keying
  // this on `fields` fires whenever ANY form state changes — exactly
  // the intent. Also fires on initial mount (no-op since submitError
  // starts null) and after a successful submit (no-op since the nav
  // unmounts the component before the next render).
  useEffect(() => {
    setSubmitError(null)
  }, [fields])

  // ─── Submit handler ──────────────────────────────────────────────
  // Defensive sequence:
  //   1. Re-run validation. If it fails (shouldn't be reachable — the
  //      button is disabled — but covers race conditions or someone
  //      forcing a click), expand all warned sections, bump touched
  //      to 9 so the section-header icons render, scroll to the first
  //      warned section. No toast, no modal. Return without firing
  //      the action.
  //   2. Drain all four debounces in parallel so any in-flight saves
  //      land before the status flip. Critical — without this, a
  //      customer who clicks Submit within 1000ms of their last edit
  //      risks a stale order in the DB.
  //   3. Fire submitOrder. On success, route to /orders?submitted=X.
  //      On failure, surface the error inline; don't navigate.
  const handleSubmit = useCallback(async () => {
    const currentValidation = validateForSubmit(toValidationInput(fields))
    if (!currentValidation.isSubmittable) {
      const warnedIds: number[] = []
      for (const id of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
        const key = `section0${id}` as keyof SubmitValidationResult
        if ((currentValidation[key] as string[]).length > 0) {
          warnedIds.push(id)
        }
      }
      setOpenSections((prev) => {
        const next = new Set(prev)
        for (const id of warnedIds) next.add(id)
        return next
      })
      if (warnedIds.length > 0) {
        setHighestSectionTouched(9)
      }
      const firstWarned = warnedIds[0]
      if (firstWarned !== undefined) {
        // rAF lets React commit the openSections update so the section
        // body is in the DOM before we scroll to it.
        requestAnimationFrame(() => {
          document
            .querySelector(`section.osec[data-section-id="${firstWarned}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        })
      }
      return
    }

    if (!draftIdRef.current) {
      setSubmitError("Cannot submit: draft has not been saved yet.")
      return
    }

    // Drain in-flight debounced writes before flipping status.
    await Promise.all([
      flushSave(),
      flushSaveMetals(),
      flushSaveCenterStones(),
      flushSaveAccentStones(),
    ])

    setIsSubmitting(true)
    setSubmitError(null)

    const result = await submitOrder({ orderId: draftIdRef.current })
    if (result.ok) {
      const param = result.identifier ?? "1"
      router.push(`/orders?submitted=${encodeURIComponent(param)}`)
      return // nav unmounts this component; no isSubmitting reset
    }

    setIsSubmitting(false)
    setSubmitError(result.error ?? "Submit failed. Please try again.")
  }, [
    fields,
    flushSave,
    flushSaveMetals,
    flushSaveCenterStones,
    flushSaveAccentStones,
    router,
  ])

  // ─── Derived display values ───────────────────────────────────────

  const selectedProductType = productTypes.find(
    (p) => p.short_code === fields.productTypeShortCode,
  )
  const needsSize =
    selectedProductType != null && SIZE_REQUIRED.has(selectedProductType.short_code)

  const basicsSummary = (() => {
    const parts: string[] = []
    if (selectedProductType) parts.push(selectedProductType.name)
    parts.push(`qty ${fields.quantity}`)
    if (fields.clientPo) parts.push(fields.clientPo)
    return parts.join(" · ")
  })()

  const descriptionSummary = (() => {
    if (!fields.description.trim()) return null
    const excerpt = fields.description.trim().slice(0, 60)
    return excerpt.length < fields.description.length ? `${excerpt}…` : excerpt
  })()

  const finishPointLabel = fields.finishPoint
    ? FINISH_POINTS.find((f) => f.key === fields.finishPoint)?.label
    : null

  // ─── Discard + Save draft handlers ────────────────────────────────
  // Step 7: Discard now does a HARD DELETE (DELETE FROM orders + child
  // CASCADE) rather than the old soft-cancel (status='cancelled').
  // §17 spec: "Hard delete on Discard." Routes to /orders?tab=drafts
  // so the customer lands on the drafts list confirming it's gone.
  // Inline confirm strip replaces the old modal dialog.

  const handleDiscardClick = () => {
    // No draft on the wire yet → nothing to delete; just navigate.
    if (!draftId) {
      router.push("/orders?tab=drafts")
      return
    }
    setDiscardConfirming(true)
  }

  const handleConfirmDiscard = async () => {
    if (!draftId) {
      router.push("/orders?tab=drafts")
      return
    }
    // Cancel any pending debounced save so it can't race the delete.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setDiscarding(true)
    const result = await discardSingleDraft({ orderId: draftId })
    if (!result.ok) {
      console.error("discardSingleDraft failed:", result.error)
      // Soft fail — navigate anyway; the row stays as draft.
    }
    router.push("/orders?tab=drafts")
  }

  const handleCancelDiscard = () => {
    setDiscardConfirming(false)
  }

  const handleSaveAndExit = async () => {
    await flushSave()
    router.push("/orders")
  }

  // ─── Stub file uploader ───────────────────────────────────────────
  // TODO Phase 2B: real Supabase Storage upload + write order_attachments row.
  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const incoming = Array.from(files)
    setStagedFiles((prev) => [...prev, ...incoming])
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="diaco-design">
      <main className="page-wrap">
        {/* Page header */}
        <header className="order-head">
          <div>
            <div className="order-head__eyebrow">
              <span>Workspace</span>
              <span>·</span>
              <span>New order</span>
              <span>·</span>
              <span>Draft</span>
            </div>
            <h1 className="order-head__title">Submit a new order</h1>
            <div className="order-head__sub">
              Drafts auto-save as you go.{" "}
              <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
            </div>
          </div>
          <div className="order-head__actions">
            <button
              type="button"
              className="btn btn--sec"
              onClick={handleSaveAndExit}
            >
              Save draft
            </button>
            {/* Step 7: Discard moved to the sticky footer with the
                inline confirm strip. Header keeps Save draft only. */}
          </div>
        </header>

        {/* Free-quote banner */}
        <div className="quote-banner">
          <div className="quote-banner__ico" aria-hidden>
            <CircleCheck size={16} />
          </div>
          <div>
            <strong>Quotes are always free.</strong>{" "}
            No commitment until you approve. We&apos;ll review your spec and
            send a CAD + itemized quote within 18–48 hours.
          </div>
        </div>

        {/* Two-column layout */}
        <div className="order-page">
          <div className="order-page__main">
            {/* 01 — Order basics */}
            <Section
              id={1}
              numLabel="01"
              title="Order basics"
              required
              open={openSections.has(1)}
              onToggle={() => toggleSection(1)}
              onTouch={() => touchSection(1)}
              warningFields={
                validation.section01.length > 0 && 1 < highestSectionTouched
                  ? validation.section01
                  : undefined
              }
              summary={openSections.has(1) ? null : basicsSummary}
            >
              <div className="field">
                <label>Client&apos;s PO</label>
                <input
                  type="text"
                  value={fields.clientPo}
                  onChange={(e) => setField("clientPo", e.target.value)}
                  placeholder="HFJ-Bennett-1024"
                />
                <span className="hint">
                  Your internal reference for this order. Choose something
                  memorable.
                </span>
              </div>

              <div className="field">
                <label>End customer</label>
                <input
                  type="text"
                  value={fields.endCustomerName}
                  onChange={(e) =>
                    setField("endCustomerName", e.target.value)
                  }
                  placeholder="Lauren M."
                />
                <span className="hint">
                  Who is this piece for? Used in messages and shipping.
                </span>
              </div>

              <div className="field">
                <label>Product type</label>
                <div className="pills" role="radiogroup" aria-label="Product type">
                  {productTypes.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={fields.productTypeShortCode === p.short_code}
                      className={`pill ${
                        fields.productTypeShortCode === p.short_code
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() => setProductType(p.short_code)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={fields.quantity}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      setField("quantity", Number.isFinite(n) && n >= 1 ? n : 1)
                    }}
                  />
                  <span className="hint">Minimum 1.</span>
                </div>

                {needsSize && (
                  <div className="field">
                    <label>Size</label>
                    <input
                      type="text"
                      value={fields.sizeSpec}
                      onChange={(e) => setField("sizeSpec", e.target.value)}
                      placeholder={
                        SIZE_HINTS[selectedProductType?.short_code ?? ""] ??
                        ""
                      }
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* 02 — Describe the piece */}
            <Section
              id={2}
              numLabel="02"
              title="Describe the piece"
              required
              open={openSections.has(2)}
              onToggle={() => toggleSection(2)}
              onTouch={() => touchSection(2)}
              warningFields={
                validation.section02.length > 0 && 2 < highestSectionTouched
                  ? validation.section02
                  : undefined
              }
              summary={
                openSections.has(2)
                  ? null
                  : descriptionSummary
                    ? `${descriptionSummary}${
                        stagedFiles.length
                          ? ` · ${stagedFiles.length} reference${stagedFiles.length === 1 ? "" : "s"}`
                          : ""
                      }`
                    : "Description not yet entered"
              }
            >
              <textarea
                className="describe"
                rows={6}
                value={fields.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Describe the piece — style, inspiration, where stones should go, anything special. The more detail, the faster we can confirm feasibility."
              />
              <div className="hint" style={{ marginTop: 6 }}>
                {lastSavedAt
                  ? `Auto-saved · ${relativeTime(lastSavedAt)}`
                  : "Auto-saves as you type."}
              </div>

              {/* Stub file dropzone — Phase 2B will wire real Storage uploads */}
              <Dropzone onFiles={handleFiles} />
              {stagedFiles.length > 0 && (
                <ul className="uploaded-list" aria-label="Staged files">
                  {stagedFiles.map((f, i) => (
                    <li key={i} className="uploaded-row">
                      <span className="ico">
                        <Upload size={16} />
                      </span>
                      <div>
                        <div className="n">{f.name}</div>
                        <div className="hint">
                          <em>Will upload after submit</em>
                        </div>
                      </div>
                      <span className="meta">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        className="rm"
                        onClick={() =>
                          setStagedFiles((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        aria-label={`Remove ${f.name}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* 03 — Finish point */}
            <Section
              id={3}
              numLabel="03"
              title="Finish point"
              required
              open={openSections.has(3)}
              onToggle={() => toggleSection(3)}
              onTouch={() => touchSection(3)}
              warningFields={
                validation.section03.length > 0 && 3 < highestSectionTouched
                  ? validation.section03
                  : undefined
              }
              summary={openSections.has(3) ? null : finishPointLabel}
            >
              <div className="field">
                <label>Where do you want us to stop?</label>
                <span className="hint" style={{ marginBottom: 6 }}>
                  This determines what you&apos;ll receive.
                </span>
                <div className="finish-cards">
                  {FINISH_POINTS.map((fp) => {
                    const active = fields.finishPoint === fp.key
                    return (
                      <button
                        key={fp.key}
                        type="button"
                        className={`finish-card ${active ? "is-active" : ""}`}
                        onClick={() => setFinishPoint(fp.key)}
                      >
                        <div className="finish-card__title">{fp.label}</div>
                        <div className="finish-card__help">{fp.help}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </Section>

            {/* 04 — Metal (functional repeating UI) */}
            {showMetal && (
              <Section
                id={4}
                numLabel="04"
                title="Metal"
                required
                open={openSections.has(4)}
                onToggle={() => toggleSection(4)}
                onTouch={() => touchSection(4)}
                warningFields={
                  validation.section04.length > 0 && 4 < highestSectionTouched
                    ? validation.section04
                    : undefined
                }
                summary={
                  openSections.has(4)
                    ? null
                    : metalsSummary(fields.metals, metalOptions)
                }
              >
                <MetalsBody
                  rows={fields.metals}
                  metalOptions={metalOptions}
                  areaTouched={metalAreaTouched}
                  onUpdateRow={updateMetalRow}
                  onAddRow={addMetalRow}
                  onRemoveRow={removeMetalRow}
                  onAreaBlur={markMetalAreaTouched}
                />
              </Section>
            )}

            {/* 05 — Center stones (functional repeating UI) */}
            {showCenterStones && (
              <Section
                id={5}
                numLabel="05"
                title="Center stones"
                optional
                open={openSections.has(5)}
                onToggle={() => toggleSection(5)}
                onTouch={() => touchSection(5)}
                warningFields={
                  validation.section05.length > 0 && 5 < highestSectionTouched
                    ? validation.section05
                    : undefined
                }
                summary={
                  openSections.has(5)
                    ? null
                    : centerStonesSummary(
                        fields.hasCenterStones,
                        fields.centerStones,
                        stoneTypes,
                        stoneShapes,
                      )
                }
              >
                <CenterStonesBody
                  gate={fields.hasCenterStones}
                  rows={fields.centerStones}
                  stoneTypes={stoneTypes}
                  stoneShapes={stoneShapes}
                  expandedIndex={expandedCenterStoneIndex}
                  onToggleExpand={toggleExpandCenterStone}
                  onGateChange={setHasCenterStones}
                  onUpdateRow={updateCenterStoneRow}
                  onAddRow={addCenterStoneRow}
                  onRemoveRow={removeCenterStoneRow}
                />
              </Section>
            )}

            {/* 06 — Accent stones (functional repeating UI) */}
            {showAccentStones && (
              <Section
                id={6}
                numLabel="06"
                title="Accent stones"
                optional
                open={openSections.has(6)}
                onToggle={() => toggleSection(6)}
                onTouch={() => touchSection(6)}
                warningFields={
                  validation.section06.length > 0 && 6 < highestSectionTouched
                    ? validation.section06
                    : undefined
                }
                summary={
                  openSections.has(6)
                    ? null
                    : accentStonesSummary(
                        fields.hasAccentStones,
                        fields.accentStones,
                        stoneTypes,
                      )
                }
              >
                <AccentStonesBody
                  gate={fields.hasAccentStones}
                  rows={fields.accentStones}
                  stoneTypes={stoneTypes}
                  expandedIndex={expandedAccentStoneIndex}
                  onToggleExpand={toggleExpandAccentStone}
                  onGateChange={setHasAccentStones}
                  onUpdateRow={updateAccentStoneRow}
                  onAddRow={addAccentStoneRow}
                  onRemoveRow={removeAccentStoneRow}
                />
              </Section>
            )}

            {/* 07 — Engraving (functional; only when finish point allows it) */}
            {showEngraving && (
              <Section
                id={7}
                numLabel="07"
                title="Engraving"
                optional
                open={openSections.has(7)}
                onToggle={() => toggleSection(7)}
                onTouch={() => touchSection(7)}
                warningFields={
                  validation.section07.length > 0 && 7 < highestSectionTouched
                    ? validation.section07
                    : undefined
                }
                summary={
                  openSections.has(7) ? null : engravingSummary(fields)
                }
              >
                <div className="field">
                  <label>
                    Engraving text <span className="opt">(optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={fields.engravingText}
                    onChange={(e) =>
                      setField("engravingText", e.target.value)
                    }
                    placeholder="e.g., Lauren · 6.14.26"
                  />
                  <span className="hint">
                    Short messages, dates, initials, coordinates — anything
                    you want hand-engraved on the piece.
                  </span>
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={fields.engravingUseLogo}
                    onChange={(e) =>
                      setField("engravingUseLogo", e.target.checked)
                    }
                  />
                  <span>
                    <span className="checkbox-row__title">Use my logo</span>
                    <span className="checkbox-row__sub">
                      We&apos;ll request the artwork before production begins.
                    </span>
                  </span>
                </label>

                {(fields.engravingUseLogo ||
                  fields.engravingText.trim()) && (
                  <div
                    className={
                      fields.engravingUseLogo &&
                      fields.engravingText.trim()
                        ? "row-2"
                        : undefined
                    }
                  >
                    {fields.engravingUseLogo && (
                      <PositionField
                        label="Logo position"
                        value={fields.engravingLogoPosition}
                        onChange={(v) => setField("engravingLogoPosition", v)}
                        options={positionOptionsFor(
                          fields.productTypeShortCode,
                        )}
                        hint="Where the logo gets engraved. Required before submission."
                      />
                    )}
                    {fields.engravingText.trim() && (
                      <PositionField
                        label="Text position"
                        value={fields.engravingTextPosition}
                        onChange={(v) => setField("engravingTextPosition", v)}
                        options={positionOptionsFor(
                          fields.productTypeShortCode,
                        )}
                        hint="Where the text gets engraved. Required before submission."
                      />
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* 08 — Shipping (functional) */}
            <Section
              id={8}
              numLabel="08"
              title="Shipping"
              required
              open={openSections.has(8)}
              onToggle={() => toggleSection(8)}
              onTouch={() => touchSection(8)}
              warningFields={
                validation.section08.length > 0 && 8 < highestSectionTouched
                  ? validation.section08
                  : undefined
              }
              summary={openSections.has(8) ? null : shippingSummary(fields)}
            >
              <div className="field">
                <label>Where should this order go?</label>
                <div className="finish-cards">
                  {SHIPPING_METHODS.map((m) => {
                    const active = fields.shippingMethod === m.key
                    return (
                      <button
                        key={m.key}
                        type="button"
                        className={`finish-card ${active ? "is-active" : ""}`}
                        onClick={() => setField("shippingMethod", m.key)}
                      >
                        <div className="finish-card__title">{m.label}</div>
                        <div className="finish-card__help">{m.help}</div>
                        {active && m.key === "standard" && (
                          <AccountAddressPreview customer={customer} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Address form — required for different_address + drop_ship,
                  blank for standard. */}
              {(fields.shippingMethod === "different_address" ||
                fields.shippingMethod === "drop_ship") && (
                <>
                  <div className="field">
                    <label>
                      {fields.shippingMethod === "drop_ship"
                        ? "End customer name"
                        : "Recipient name"}
                    </label>
                    <input
                      type="text"
                      value={fields.shipToRecipientName}
                      onChange={(e) =>
                        setField("shipToRecipientName", e.target.value)
                      }
                      placeholder={
                        fields.shippingMethod === "drop_ship"
                          ? "Lauren M."
                          : "Who is receiving this shipment?"
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Address line 1</label>
                    <input
                      type="text"
                      value={fields.shipToAddressLine1}
                      onChange={(e) =>
                        setField("shipToAddressLine1", e.target.value)
                      }
                      placeholder="Street address"
                    />
                  </div>

                  <div className="field">
                    <label>
                      Address line 2{" "}
                      <span className="opt">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={fields.shipToAddressLine2}
                      onChange={(e) =>
                        setField("shipToAddressLine2", e.target.value)
                      }
                      placeholder="Apt, suite, floor"
                    />
                  </div>

                  <div className="row-2">
                    <div className="field">
                      <label>City</label>
                      <input
                        type="text"
                        value={fields.shipToCity}
                        onChange={(e) =>
                          setField("shipToCity", e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label>State</label>
                      <select
                        value={fields.shipToState}
                        onChange={(e) =>
                          setField("shipToState", e.target.value)
                        }
                      >
                        <option value="">Select state</option>
                        {US_STATES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row-2">
                    <div
                      className={`field ${isInvalidZip(fields.shipToPostalCode) ? "field--error" : ""}`}
                    >
                      <label>ZIP code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        value={fields.shipToPostalCode}
                        onChange={(e) =>
                          setField(
                            "shipToPostalCode",
                            // Strip non-digits so paste/swipe inputs land clean.
                            e.target.value.replace(/\D/g, "").slice(0, 5),
                          )
                        }
                        placeholder="91103"
                      />
                      {isInvalidZip(fields.shipToPostalCode) && (
                        <span className="field__error">
                          Enter a 5-digit ZIP code
                        </span>
                      )}
                    </div>
                    <div className="field">
                      {/* Country is locked to United States for Phase 2B.
                          When international shipping ships as a product,
                          replace this with a real country select. */}
                      <label>Country</label>
                      <input
                        type="text"
                        value="United States"
                        disabled
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Phone (for the carrier)</label>
                    <input
                      type="tel"
                      value={fields.shipToPhone}
                      onChange={(e) =>
                        setField("shipToPhone", formatPhone(e.target.value))
                      }
                      placeholder="(626) 555-0148"
                      maxLength={14}
                    />
                    <span className="hint">
                      Used by the carrier to coordinate delivery. Not shared
                      otherwise.
                    </span>
                  </div>
                </>
              )}
            </Section>

            {/* 09 — Anything else (functional) */}
            <Section
              id={9}
              numLabel="09"
              title="Anything else for your AM?"
              optional
              open={openSections.has(9)}
              onToggle={() => toggleSection(9)}
              onTouch={() => touchSection(9)}
              summary={
                openSections.has(9)
                  ? null
                  : fields.submissionNotes.trim()
                    ? (() => {
                        const excerpt = fields.submissionNotes
                          .trim()
                          .slice(0, 60)
                        return excerpt.length <
                          fields.submissionNotes.trim().length
                          ? `${excerpt}…`
                          : excerpt
                      })()
                    : null
              }
            >
              <div className="field">
                <label>
                  Notes for your AM <span className="opt">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={fields.submissionNotes}
                  onChange={(e) => setField("submissionNotes", e.target.value)}
                  placeholder="Anything we should know before quoting — deadlines, customer's tastes, prior orders to reference, anything special."
                />
                <span className="hint">
                  Visible only to your account manager and the Dia-Co team.
                </span>
              </div>
            </Section>
          </div>

          {/* Right rail */}
          <aside className="order-page__side">
            <LiveSummary
              fields={fields}
              selectedProductType={selectedProductType}
              stagedFilesCount={stagedFiles.length}
            />
            <NextStepsPanel />
          </aside>
        </div>

        {/* Submit bar (sticky) */}
        <div className="submit-bar">
          <div className="recap">
            <strong>
              {basicsSummary ||
                fields.description.trim().slice(0, 60) ||
                "Tell us what you'd like to make."}
            </strong>
            <br />
            {finishPointLabel
              ? `Finish: ${finishPointLabel}`
              : "Pick a finish point to continue."}
          </div>
          {submitError && (
            <div className="submit-error" role="alert">
              {submitError}
            </div>
          )}
          {discardConfirming ? (
            // Step 7 inline confirm strip — replaces the standard
            // three-button row. Confirm fires hard delete; Cancel
            // returns to the row without action.
            <div className="actions discard-confirm" role="alert">
              <span className="discard-confirm__prompt">
                Discard draft?
              </span>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmDiscard}
                disabled={discarding}
              >
                {discarding ? "Discarding…" : "Confirm"}
              </button>
              <button
                type="button"
                className="btn btn--sec"
                onClick={handleCancelDiscard}
                disabled={discarding}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleDiscardClick}
                disabled={isSubmitting}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn btn--sec"
                onClick={handleSaveAndExit}
                disabled={isSubmitting}
              >
                Save draft
              </button>
              <button
                type="button"
                className="btn"
                disabled={isSubmitting || !validation.isSubmittable}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="spin" /> Submitting…
                  </>
                ) : (
                  "Submit for free quote"
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function SaveIndicator({
  status,
  lastSavedAt,
}: {
  status: SaveStatus
  lastSavedAt: Date | null
}) {
  if (status === "saving") return <span className="save-indicator">Saving…</span>
  if (status === "error")
    return (
      <span className="save-indicator save-indicator--error">
        Save failed — will retry
      </span>
    )
  if (status === "saved" || lastSavedAt)
    return (
      <span className="save-indicator save-indicator--ok">
        Saved {relativeTime(lastSavedAt)}
      </span>
    )
  return null
}

interface SectionProps {
  id: number
  numLabel: string
  title: string
  required?: boolean
  optional?: boolean
  subtitle?: string
  summary?: string | null
  open: boolean
  onToggle: () => void
  // Step 6 additions:
  // warningFields: when non-empty, render ⚠ + tooltip in the header.
  //   Caller is responsible for activation gating (sectionId <
  //   highestSectionTouched); when not active, pass undefined.
  // onTouch: fires on any interaction inside the section body
  //   (capture-phase click/change). Used to bump highestSectionTouched.
  warningFields?: string[]
  onTouch?: () => void
  children: React.ReactNode
}

function Section({
  id,
  numLabel,
  title,
  required,
  optional,
  subtitle,
  summary,
  open,
  onToggle,
  warningFields,
  onTouch,
  children,
}: SectionProps) {
  const showWarning = !!(warningFields && warningFields.length > 0)
  const warningTitle = showWarning
    ? `Missing: ${warningFields!.join(", ")}`
    : undefined
  return (
    <section
      className={`osec ${open ? "is-open" : ""}`}
      data-section-id={id}
    >
      <button
        type="button"
        className="osec__head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="osec__num">{numLabel}</span>
        <span>
          <span className="osec__title">
            {title}
            {required && <span className="req">Required</span>}
            {optional && <span className="opt">Optional</span>}
          </span>
          {subtitle && <span className="osec__sub">{subtitle}</span>}
        </span>
        <span className="osec__summary">
          {summary && <strong>{summary}</strong>}
        </span>
        {/* Warning icon — always rendered so the right-side cluster's
           grid layout stays invariant whether the icon is active or
           not. visibility: hidden via the modifier class when no
           warning, so titles stay aligned across sections. */}
        <span
          className={`osec__warn${showWarning ? "" : " osec__warn--hidden"}`}
          title={warningTitle}
          aria-label={warningTitle}
          role={showWarning ? "img" : undefined}
          aria-hidden={showWarning ? undefined : true}
        >
          <AlertTriangle size={14} />
        </span>
        <span className="osec__chev">
          <ChevronRight size={16} />
        </span>
      </button>
      {open && (
        <div
          className="osec__body"
          onClickCapture={onTouch}
          onChangeCapture={onTouch}
        >
          {children}
        </div>
      )}
    </section>
  )
}

function Dropzone({ onFiles }: { onFiles: (files: FileList | null) => void }) {
  // TODO Phase 2B: connect to Supabase Storage. For 2A this is purely visual
  // + tracks filenames in component state.
  return (
    <label className="dropzone" aria-label="Add reference files">
      <input
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="dropzone__icon" aria-hidden>
        <Upload size={28} />
      </div>
      <div className="dropzone__title">Drop CAD files or reference images here</div>
      <div className="dropzone__sub">
        .stl, .3dm, .obj, .zip up to 200 MB · JPG, PNG, PDF references welcome
      </div>
    </label>
  )
}

function CancelConfirmDialog({
  busy,
  onKeep,
  onDiscard,
}: {
  busy: boolean
  onKeep: () => void
  onDiscard: () => void
}) {
  return (
    <div className="confirm-dialog" role="dialog" aria-modal="true" onClick={onKeep}>
      <div
        className="confirm-dialog__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="confirm-dialog__title">Discard this draft?</h3>
        <p className="confirm-dialog__body">
          Your progress will be deleted. This can&apos;t be undone.
        </p>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onKeep}
            disabled={busy}
          >
            Keep draft
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onDiscard}
            disabled={busy}
          >
            {busy ? "Discarding…" : "Discard"}
          </button>
        </div>
      </div>
    </div>
  )
}

function MetalsBody({
  rows,
  metalOptions,
  areaTouched,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onAreaBlur,
}: {
  rows: MetalRow[]
  metalOptions: MetalOption[]
  areaTouched: boolean[]
  onUpdateRow: <K extends keyof MetalRow>(
    index: number,
    key: K,
    value: MetalRow[K],
  ) => void
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onAreaBlur: (index: number) => void
}) {
  const { rowErrors } = validateMetals(rows)
  const showRemove = rows.length > 1
  const showAdd = rows.length < MAX_METAL_ROWS

  // Finish reference modal is a single global modal — any row's (i) button
  // opens the same one. No per-row state needed.
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false)

  return (
    <>
      <div className="metal-rows">
        {rows.map((row, i) => {
          const error = rowErrors[i]
          const showError = Boolean(error) && areaTouched[i]
          const finishOptions = availableFinishesForMetal(row.metal_id, metalOptions)
          return (
            <div className="metal-row" key={i}>
              <div className="metal-row__head">
                <span className="metal-row__num">Metal {i + 1}</span>
                {showRemove && (
                  <button
                    type="button"
                    className="metal-row__remove"
                    onClick={() => onRemoveRow(i)}
                    aria-label={`Remove metal ${i + 1}`}
                  >
                    <X size={14} /> Remove
                  </button>
                )}
              </div>

              <div className="metal-row__grid">
                <div className="field">
                  <label>Karat &amp; color</label>
                  <select
                    value={row.metal_id ?? ""}
                    onChange={(e) =>
                      onUpdateRow(i, "metal_id", e.target.value || null)
                    }
                  >
                    <option value="">Select metal</option>
                    {metalOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>
                    Finish
                    <button
                      type="button"
                      className="field-info-btn"
                      aria-label="Show finish reference"
                      onClick={() => setIsFinishModalOpen(true)}
                    >
                      <Info size={13} />
                    </button>
                  </label>
                  <select
                    value={row.finish ?? ""}
                    onChange={(e) =>
                      onUpdateRow(
                        i,
                        "finish",
                        (e.target.value || null) as MetalFinish | null,
                      )
                    }
                  >
                    <option value="">Select finish</option>
                    {finishOptions.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`field ${showError ? "field--error" : ""}`}>
                  <label>Area</label>
                  <input
                    type="text"
                    value={row.area}
                    onChange={(e) => onUpdateRow(i, "area", e.target.value)}
                    onBlur={() => onAreaBlur(i)}
                    placeholder="e.g., band, top, prongs"
                  />
                  {showError ? (
                    <span className="field__error">{error}</span>
                  ) : (
                    <span className="hint">
                      Only needed for multi-metal pieces.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <button type="button" className="btn btn--sec metal-add" onClick={onAddRow}>
          + Add another metal
        </button>
      )}

      {isFinishModalOpen && (
        <FinishReferenceModal onClose={() => setIsFinishModalOpen(false)} />
      )}
    </>
  )
}

// ── Section 05 (Center stones) body ─────────────────────────────────

function CenterStonesBody({
  gate,
  rows,
  stoneTypes,
  stoneShapes,
  expandedIndex,
  onToggleExpand,
  onGateChange,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}: {
  gate: HasStones | null
  rows: CenterStoneRow[]
  stoneTypes: StoneTypeOption[]
  stoneShapes: StoneShapeOption[]
  expandedIndex: number | null
  onToggleExpand: (index: number) => void
  onGateChange: (next: HasStones | null) => void
  onUpdateRow: <K extends keyof CenterStoneRow>(
    index: number,
    key: K,
    value: CenterStoneRow[K],
  ) => void
  onAddRow: () => void
  onRemoveRow: (index: number) => void
}) {
  const showAdd = rows.length < MAX_CENTER_STONE_ROWS
  const showRemove = rows.length > 1
  const showDisclaimer = gate === "yes" && anyCustomerSupplied(rows)

  return (
    <>
      {/* Gate — three pill buttons */}
      <div className="field">
        <label>Does this piece have center stones?</label>
        <div className="pills" role="radiogroup" aria-label="Center stones gate">
          <GatePill label="Yes" active={gate === "yes"} onClick={() => onGateChange("yes")} />
          <GatePill label="No" active={gate === "no"} onClick={() => onGateChange("no")} />
          <GatePill label="TBD" active={gate === "tbd"} onClick={() => onGateChange("tbd")} />
        </div>
      </div>

      {gate === "yes" && (
        <>
          {showDisclaimer && <SupplyDisclaimer />}

          <div className="stone-rows">
            {rows.map((row, i) => (
              <CenterStoneRowEditor
                key={i}
                index={i}
                row={row}
                stoneTypes={stoneTypes}
                stoneShapes={stoneShapes}
                showRemove={showRemove}
                expanded={expandedIndex === i}
                onToggleExpand={onToggleExpand}
                onUpdate={onUpdateRow}
                onRemove={onRemoveRow}
              />
            ))}
          </div>

          {showAdd && (
            <button
              type="button"
              className="btn btn--sec stone-add"
              onClick={onAddRow}
            >
              {addStoneButtonLabel("center", rows.length)}
            </button>
          )}
        </>
      )}
    </>
  )
}

function GatePill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`pill ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function SupplyDisclaimer() {
  return (
    <div className="quote-banner stone-supply-banner" role="note">
      <div className="quote-banner__ico" aria-hidden>
        <CircleCheck size={16} />
      </div>
      <div>
        If you plan to supply stones, we need them 48 hours before production
        can begin — for measurement, inspection, and any necessary design
        adjustments.
      </div>
    </div>
  )
}

function CenterStoneRowEditor({
  index,
  row,
  stoneTypes,
  stoneShapes,
  showRemove,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: {
  index: number
  row: CenterStoneRow
  stoneTypes: StoneTypeOption[]
  stoneShapes: StoneShapeOption[]
  showRemove: boolean
  expanded: boolean
  onToggleExpand: (index: number) => void
  onUpdate: <K extends keyof CenterStoneRow>(
    index: number,
    key: K,
    value: CenterStoneRow[K],
  ) => void
  onRemove: (index: number) => void
}) {
  const top = row.topType
  const isDiamond = isTopTypeDiamond(top)
  const isOther = top === "other"
  const isColorStone = top === "color_stone"
  const isCustomerSupplied = row.supplySource === "customer"
  const isDiacoSupplied = row.supplySource === "diaco"
  const certOptions = top ? CERT_OPTIONS_BY_TOP_TYPE[top] : []
  const colorStoneOptions = colorStoneSubOptions(stoneTypes)
  const summary = centerStoneSummary(row, stoneTypes, stoneShapes)
  // Per-row submit-readiness warning. Computed every render so the icon
  // disappears as soon as the customer finishes the row. Only surfaces
  // on the collapsed head — when the row is open the fields themselves
  // show what's empty, so the icon would be noise.
  const missingFields = missingCenterStoneFields(row)
  const showWarning = !expanded && missingFields.length > 0
  const warningTitle = `Missing: ${missingFields.join(", ")}`

  return (
    <div
      className={`stone-row${expanded ? " stone-row--open" : " stone-row--collapsed"}`}
    >
      {/* Accordion head — clickable to toggle. Remove button calls
         stopPropagation so a click on × removes the row instead of
         expanding it. The whole bar gets role=button + keyboard support
         since it's the primary affordance for opening a collapsed row. */}
      <div
        className="stone-row__head stone-row__head--toggle"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? `Collapse center stone ${index + 1}`
            : `Expand center stone ${index + 1}`
        }
        onClick={() => onToggleExpand(index)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleExpand(index)
          }
        }}
      >
        {showWarning && (
          <span
            className="stone-row__warn"
            title={warningTitle}
            aria-label={warningTitle}
            role="img"
          >
            <AlertTriangle size={14} />
          </span>
        )}
        <span className="stone-row__num">Center stone {index + 1}</span>
        {!expanded && (
          <span className="stone-row__summary"> — {summary}</span>
        )}
        <span className="stone-row__head-spacer" />
        <span className="stone-row__chevron" aria-hidden>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
        {showRemove && (
          <button
            type="button"
            className="stone-row__remove"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(index)
            }}
            aria-label={`Remove center stone ${index + 1}`}
          >
            <X size={14} /> Remove
          </button>
        )}
      </div>

      {!expanded ? null : (
        <>

      {/* ─── Row 1 — Type / (Shape OR Description) / Supply ─────────
         Type cell stacks the top-level select with the color-stone
         sub-pick when applicable. Shape is omitted for Other (case D),
         which gets a wide description input instead. */}
      <div className="stone-row__grid">
        <div className="field">
          <label>Type</label>
          <select
            value={top ?? ""}
            onChange={(e) =>
              onUpdate(
                index,
                "topType",
                (e.target.value || null) as CenterStoneTopType | null,
              )
            }
          >
            <option value="">Select type</option>
            <option value="natural_diamond">Natural Diamond</option>
            <option value="lab_diamond">Lab-Grown Diamond</option>
            <option value="color_stone">Color Stone</option>
            <option value="other">Other (we&apos;ll confirm)</option>
          </select>
          {isColorStone && (
            <select
              className="stone-row__subtype"
              value={row.stoneTypeId ?? ""}
              onChange={(e) =>
                onUpdate(index, "stoneTypeId", e.target.value || null)
              }
            >
              <option value="">Select which</option>
              {colorStoneOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {isOther ? (
          <div className="field stone-row__desc">
            <label>Description</label>
            <input
              type="text"
              value={row.customStoneTypeName}
              onChange={(e) =>
                onUpdate(index, "customStoneTypeName", e.target.value)
              }
              placeholder="Tell us what kind of stone — we'll confirm"
              maxLength={200}
            />
          </div>
        ) : (
          <div className="field">
            <label>Shape</label>
            <select
              value={row.shapeId ?? ""}
              onChange={(e) =>
                onUpdate(index, "shapeId", e.target.value || null)
              }
            >
              <option value="">Select shape</option>
              {stoneShapes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label>Supply</label>
          <select
            value={row.supplySource ?? ""}
            onChange={(e) =>
              onUpdate(
                index,
                "supplySource",
                (e.target.value || null) as StoneSupply | null,
              )
            }
          >
            <option value="">Select source</option>
            {CENTER_STONE_SUPPLY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Rows 2+ — depend on top type + supply ──────────────────
         Case A (diamond + diaco):    Carat | Color | Clarity   then Make | Cert | filler
         Case B (diamond + customer): Length | Width | Depth
         Case C-diaco (color + diaco): Carat | Cert | filler
         Case C-customer (color + customer): Length | Width | Depth
         Case D (other):              no row 2 — just description in row 1
      */}
      {!isOther && (
        <>
          {/* Customer-supplied: MM dimensions */}
          {isCustomerSupplied && (
            <div className="stone-row__grid">
              <div className="field">
                <label>Length (mm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.lengthMm}
                  onChange={(e) =>
                    onUpdate(index, "lengthMm", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="field">
                <label>Width (mm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.widthMm}
                  onChange={(e) =>
                    onUpdate(index, "widthMm", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="field">
                <label>Depth (mm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.depthMm}
                  onChange={(e) =>
                    onUpdate(index, "depthMm", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Dia-Co supplied: ranges + cert */}
          {isDiacoSupplied && (
            <>
              <div className="stone-row__grid">
                <div className="field">
                  <label>Carat range</label>
                  <RangeNumeric
                    min={row.caratMin}
                    max={row.caratMax}
                    onMinChange={(v) => onUpdate(index, "caratMin", v)}
                    onMaxChange={(v) => onUpdate(index, "caratMax", v)}
                    placeholder="0.00"
                  />
                </div>
                {isDiamond ? (
                  <>
                    <div className="field">
                      <label>Color range</label>
                      <RangeSelect
                        min={row.colorMin}
                        max={row.colorMax}
                        options={COLOR_GRADES}
                        onMinChange={(v) => onUpdate(index, "colorMin", v)}
                        onMaxChange={(v) => onUpdate(index, "colorMax", v)}
                      />
                    </div>
                    <div className="field">
                      <label>Clarity range</label>
                      <RangeSelect
                        min={row.clarityMin}
                        max={row.clarityMax}
                        options={CLARITY_GRADES}
                        onMinChange={(v) => onUpdate(index, "clarityMin", v)}
                        onMaxChange={(v) => onUpdate(index, "clarityMax", v)}
                      />
                    </div>
                  </>
                ) : (
                  // Color stone + diaco: Carat | Cert | (filler)
                  <>
                    <div className="field">
                      <label>Certification</label>
                      <CertMultiSelect
                        value={row.certification}
                        options={certOptions}
                        onChange={(next) =>
                          onUpdate(index, "certification", next)
                        }
                      />
                    </div>
                    <div className="field stone-row__filler" aria-hidden />
                  </>
                )}
              </div>

              {/* Row 3 — diamond + diaco only: Make + Cert */}
              {isDiamond && (
                <div className="stone-row__grid">
                  <div className="field">
                    <label>Make range</label>
                    <RangeSelect
                      min={row.makeMin}
                      max={row.makeMax}
                      options={MAKE_GRADES}
                      onMinChange={(v) => onUpdate(index, "makeMin", v)}
                      onMaxChange={(v) => onUpdate(index, "makeMax", v)}
                    />
                  </div>
                  <div className="field">
                    <label>Certification</label>
                    <CertMultiSelect
                      value={row.certification}
                      options={certOptions}
                      onChange={(next) =>
                        onUpdate(index, "certification", next)
                      }
                    />
                  </div>
                  <div className="field stone-row__filler" aria-hidden />
                </div>
              )}
            </>
          )}
        </>
      )}
        </>
      )}
    </div>
  )
}

// ── Section 06 (Accent stones) body ─────────────────────────────────
// Structurally mirrors CenterStonesBody but with the simpler 2-field
// row: Type + Supply. GatePill + SupplyDisclaimer are reused verbatim
// from Section 05.

function AccentStonesBody({
  gate,
  rows,
  stoneTypes,
  expandedIndex,
  onToggleExpand,
  onGateChange,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}: {
  gate: HasStones | null
  rows: AccentStoneRow[]
  stoneTypes: StoneTypeOption[]
  expandedIndex: number | null
  onToggleExpand: (index: number) => void
  onGateChange: (next: HasStones | null) => void
  onUpdateRow: <K extends keyof AccentStoneRow>(
    index: number,
    key: K,
    value: AccentStoneRow[K],
  ) => void
  onAddRow: () => void
  onRemoveRow: (index: number) => void
}) {
  const showAdd = rows.length < MAX_ACCENT_STONE_ROWS
  const showRemove = rows.length > 1
  const showDisclaimer = gate === "yes" && anyCustomerSupplied(rows)

  return (
    <>
      {/* Gate — three pill buttons, identical UI to Section 05 */}
      <div className="field">
        <label>Does this piece have accent stones?</label>
        <div className="pills" role="radiogroup" aria-label="Accent stones gate">
          <GatePill label="Yes" active={gate === "yes"} onClick={() => onGateChange("yes")} />
          <GatePill label="No" active={gate === "no"} onClick={() => onGateChange("no")} />
          <GatePill label="TBD" active={gate === "tbd"} onClick={() => onGateChange("tbd")} />
        </div>
      </div>

      {gate === "yes" && (
        <>
          {showDisclaimer && <SupplyDisclaimer />}

          <div className="stone-rows">
            {rows.map((row, i) => (
              <AccentStoneRowEditor
                key={i}
                index={i}
                row={row}
                stoneTypes={stoneTypes}
                showRemove={showRemove}
                expanded={expandedIndex === i}
                onToggleExpand={onToggleExpand}
                onUpdate={onUpdateRow}
                onRemove={onRemoveRow}
              />
            ))}
          </div>

          {showAdd && (
            <button
              type="button"
              className="btn btn--sec stone-add"
              onClick={onAddRow}
            >
              {addStoneButtonLabel("accent", rows.length)}
            </button>
          )}
        </>
      )}
    </>
  )
}

function AccentStoneRowEditor({
  index,
  row,
  stoneTypes,
  showRemove,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: {
  index: number
  row: AccentStoneRow
  stoneTypes: StoneTypeOption[]
  showRemove: boolean
  expanded: boolean
  onToggleExpand: (index: number) => void
  onUpdate: <K extends keyof AccentStoneRow>(
    index: number,
    key: K,
    value: AccentStoneRow[K],
  ) => void
  onRemove: (index: number) => void
}) {
  const top = row.topType
  const isColorStone = top === "color_stone"
  const colorStoneOptions = accentColorStoneSubOptions(stoneTypes)
  const summary = accentStoneSummary(row, stoneTypes)
  const missingFields = missingAccentStoneFields(row)
  const showWarning = !expanded && missingFields.length > 0
  const warningTitle = `Missing: ${missingFields.join(", ")}`

  return (
    <div
      className={`stone-row${expanded ? " stone-row--open" : " stone-row--collapsed"}`}
    >
      {/* Accordion head — clickable. Stops propagation on remove so the
         × button removes the row instead of toggling expansion. */}
      <div
        className="stone-row__head stone-row__head--toggle"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? `Collapse accent stone ${index + 1}`
            : `Expand accent stone ${index + 1}`
        }
        onClick={() => onToggleExpand(index)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleExpand(index)
          }
        }}
      >
        {showWarning && (
          <span
            className="stone-row__warn"
            title={warningTitle}
            aria-label={warningTitle}
            role="img"
          >
            <AlertTriangle size={14} />
          </span>
        )}
        <span className="stone-row__num">Accent stone {index + 1}</span>
        {!expanded && (
          <span className="stone-row__summary"> — {summary}</span>
        )}
        <span className="stone-row__head-spacer" />
        <span className="stone-row__chevron" aria-hidden>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
        {showRemove && (
          <button
            type="button"
            className="stone-row__remove"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(index)
            }}
            aria-label={`Remove accent stone ${index + 1}`}
          >
            <X size={14} /> Remove
          </button>
        )}
      </div>

      {!expanded ? null : (
        // Single row: Type (with optional sub-pick) | Supply | filler. No
        // shape, description, ranges, cert, or MM fields on accent rows —
        // every case resolves to (stone_type_id, supply_source).
        <div className="stone-row__grid">
          <div className="field">
            <label>Type</label>
            <select
              value={top ?? ""}
              onChange={(e) =>
                onUpdate(
                  index,
                  "topType",
                  (e.target.value || null) as AccentStoneTopType | null,
                )
              }
            >
              <option value="">Select type</option>
              <option value="natural_diamond">Natural Diamond</option>
              <option value="lab_diamond">Lab-Grown Diamond</option>
              <option value="color_stone">Color Stone</option>
            </select>
            {isColorStone && (
              <select
                className="stone-row__subtype"
                value={row.subType ?? ""}
                onChange={(e) =>
                  onUpdate(index, "subType", e.target.value || null)
                }
              >
                <option value="">Select which</option>
                {colorStoneOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label>Supply</label>
            <select
              value={row.supplySource ?? ""}
              onChange={(e) =>
                onUpdate(
                  index,
                  "supplySource",
                  (e.target.value || null) as StoneSupply | null,
                )
              }
            >
              <option value="">Select source</option>
              {ACCENT_STONE_SUPPLY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field stone-row__filler" aria-hidden />
        </div>
      )}

      {/* Quality fields — only when expanded AND Dia-Co supplies a
         diamond. Each variant lives in its own block below the
         Type/Supply grid so it stacks cleanly and doesn't share the
         auto-fit cell flow above.
           Natural: Color + Clarity dropdowns (Clarity options
                    filtered by Color tier, disabled until Color is
                    picked — keeps layout stable, makes the dependency
                    visible upfront).
           Lab:     static informational line in muted-hint register.
      */}
      {expanded &&
        row.supplySource === "diaco" &&
        row.topType === "natural_diamond" && (
          <div className="stone-row__grid">
            <div className="field">
              <label>Color</label>
              <select
                value={row.qualityColor ?? ""}
                onChange={(e) =>
                  onUpdate(index, "qualityColor", e.target.value || null)
                }
              >
                <option value="">Select color</option>
                {NATURAL_DIAMOND_COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Clarity</label>
              <select
                value={row.qualityClarity ?? ""}
                onChange={(e) =>
                  onUpdate(index, "qualityClarity", e.target.value || null)
                }
                disabled={!row.qualityColor}
              >
                <option value="">
                  {row.qualityColor ? "Select clarity" : "Pick color first"}
                </option>
                {(row.qualityColor
                  ? NATURAL_DIAMOND_CLARITY_BY_COLOR[row.qualityColor] ?? []
                  : []
                ).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field stone-row__filler" aria-hidden />
          </div>
        )}

      {expanded &&
        row.supplySource === "diaco" &&
        row.topType === "lab_diamond" && (
          <div className="stone-row__lab-quality">
            Color: {LAB_DIAMOND_AUTO_COLOR} · Clarity:{" "}
            {LAB_DIAMOND_AUTO_CLARITY}
          </div>
        )}
    </div>
  )
}

// "+ Add a ..." vs "+ Add another ...". One helper, used by both
// Section 05 (centers) and Section 06 (accents). Handles the "a" vs
// "an" article for both nouns.
function addStoneButtonLabel(kind: "center" | "accent", count: number): string {
  if (count > 0) return `+ Add another ${kind} stone`
  return kind === "accent" ? "+ Add an accent stone" : "+ Add a center stone"
}

// Cert multi-select dropdown — trigger looks like a regular <select>,
// click opens a checkbox panel anchored below. "None" is mutually
// exclusive with the rest. Close via: click trigger, click outside,
// or Escape. Empty selection normalizes to null on commit.
function CertMultiSelect({
  value,
  options,
  onChange,
}: {
  value: string[] | null
  options: string[]
  onChange: (next: string[] | null) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        setOpen(false)
      }
    }
    function onPointer(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onPointer)
    }
  }, [open])

  const current = value ?? []

  // Trigger label rules per the locked spec:
  //   0 selected → placeholder
  //   1-3 selected → comma-separated names in option-list order
  //   4+ → "N selected"
  const triggerLabel = (() => {
    if (current.length === 0) return "Select certifications"
    if (current.length <= 3) {
      const ordered = options.filter((o) => current.includes(o))
      return ordered.join(", ")
    }
    return `${current.length} selected`
  })()

  function toggle(opt: string) {
    const set = new Set(current)
    if (opt === "None") {
      if (set.has("None")) {
        set.delete("None")
      } else {
        set.clear()
        set.add("None")
      }
    } else {
      if (set.has(opt)) {
        set.delete(opt)
      } else {
        // Picking any non-None clears None.
        set.delete("None")
        set.add(opt)
      }
    }
    // Preserve option-list ordering in storage so display + storage match.
    const next = options.filter((o) => set.has(o))
    onChange(next.length === 0 ? null : next)
  }

  return (
    <div className="cert-multiselect" ref={wrapperRef}>
      <button
        type="button"
        className="cert-multiselect__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={
            current.length === 0 ? "cert-multiselect__placeholder" : undefined
          }
        >
          {triggerLabel}
        </span>
        <span className="cert-multiselect__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="cert-multiselect__panel" role="listbox">
          {options.map((opt) => {
            const checked = current.includes(opt)
            return (
              <label key={opt} className="cert-multiselect__item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt)}
                />
                <span>{opt}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RangeNumeric({
  min,
  max,
  onMinChange,
  onMaxChange,
  placeholder,
}: {
  min: string
  max: string
  onMinChange: (next: string) => void
  onMaxChange: (next: string) => void
  placeholder?: string
}) {
  return (
    <div className="range-group">
      <input
        type="text"
        inputMode="decimal"
        value={min}
        onChange={(e) => onMinChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Minimum"
      />
      <span className="range-group__sep">to</span>
      <input
        type="text"
        inputMode="decimal"
        value={max}
        onChange={(e) => onMaxChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Maximum"
      />
    </div>
  )
}

function RangeSelect({
  min,
  max,
  options,
  onMinChange,
  onMaxChange,
}: {
  min: string | null
  max: string | null
  options: string[]
  onMinChange: (next: string | null) => void
  onMaxChange: (next: string | null) => void
}) {
  return (
    <div className="range-group">
      <select
        value={min ?? ""}
        onChange={(e) => onMinChange(e.target.value || null)}
        aria-label="Minimum"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="range-group__sep">to</span>
      <select
        value={max ?? ""}
        onChange={(e) => onMaxChange(e.target.value || null)}
        aria-label="Maximum"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function FinishReferenceModal({ onClose }: { onClose: () => void }) {
  // Escape closes. Body scroll locks while open and restores on unmount.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  // SSR guard: createPortal needs document.body. The modal only renders when
  // isFinishModalOpen=true, which is only ever set client-side, but typeof
  // check is the standard defensive pattern.
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="finish-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Metal finishes reference"
      onClick={onClose}
    >
      <div
        className="finish-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="finish-modal__head">
          <h3 className="finish-modal__title">Metal Finishes</h3>
          <button
            type="button"
            className="finish-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="finish-modal__body">
          <img
            src="/finish-reference.png"
            alt="Finish reference: hammered, satin, matte, sandblasted, high polish"
            className="finish-modal__img"
          />
        </div>
        <p className="finish-modal__note">
          Antiqued finish (Silver only) not pictured — ask your AM for samples.
        </p>
      </div>
    </div>,
    document.body,
  )
}

function AccountAddressPreview({ customer }: { customer: CustomerForForm }) {
  const lines: string[] = []
  if (customer.billingAddressLine1) lines.push(customer.billingAddressLine1)
  if (customer.billingAddressLine2) lines.push(customer.billingAddressLine2)
  const cityStateZip = [
    customer.billingCity,
    customer.billingState,
    customer.billingPostalCode,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/,\s+(\d)/, " $1") // "Portland, OR, 97210" → "Portland, OR 97210"
  if (cityStateZip) lines.push(cityStateZip)
  if (customer.billingCountry === "US") {
    lines.push("United States")
  } else if (customer.billingCountry) {
    lines.push(customer.billingCountry)
  }

  const hasAddress = lines.length > 0

  return (
    <div className="finish-card__preview">
      <div className="finish-card__preview-name">{customer.name}</div>
      {hasAddress ? (
        lines.map((line, i) => (
          <div key={i} className="finish-card__preview-line">
            {line}
          </div>
        ))
      ) : (
        <div className="finish-card__preview-line finish-card__preview-line--muted">
          No address on file yet — your AM will confirm before we ship.
        </div>
      )}
    </div>
  )
}

function PositionField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: EngravingPosition | null
  onChange: (next: EngravingPosition | null) => void
  options: EngravingPosition[]
  hint?: string
}) {
  // If the stored value isn't in the current option set (e.g., customer
  // changed product type after picking), drop it back to placeholder so
  // the select renders cleanly. The underlying field already got cleared
  // by clearStaleEngravingPositions when product type changed.
  const displayValue = value && options.includes(value) ? value : ""
  return (
    <div className="field">
      <label>{label}</label>
      <select
        value={displayValue}
        onChange={(e) =>
          onChange((e.target.value || null) as EngravingPosition | null)
        }
      >
        <option value="">Choose a position…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {ENGRAVING_POSITION_LABEL[opt]}
          </option>
        ))}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

function ComingSoon() {
  return (
    <div className="osec-shell">
      <div className="osec-shell__icon" aria-hidden>
        <Construction size={22} />
      </div>
      <p className="osec-shell__copy">
        We&apos;re building this section in Phase&nbsp;2B. The submission
        isn&apos;t blocked — you can save this as a draft and complete it
        once we ship the rest.
      </p>
    </div>
  )
}

function LiveSummary({
  fields,
  selectedProductType,
  stagedFilesCount,
}: {
  fields: FormFields
  selectedProductType?: ProductTypeOption
  stagedFilesCount: number
}) {
  const empty =
    !fields.clientPo &&
    !fields.endCustomerName &&
    !selectedProductType &&
    !fields.finishPoint &&
    !fields.description &&
    stagedFilesCount === 0

  if (empty) {
    return (
      <aside className="side-summary side-summary--wide">
        <div className="side-summary__head">
          <div className="eyebrow">Live summary</div>
          <div className="tt">Your order, as you go</div>
        </div>
        <div className="side-summary__body" style={{ paddingBottom: 18 }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--fg-3)",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            Start typing — your order will appear here.
          </p>
        </div>
      </aside>
    )
  }

  const finishLabel = fields.finishPoint
    ? FINISH_POINTS.find((f) => f.key === fields.finishPoint)?.label
    : null

  const needsSize =
    selectedProductType != null && SIZE_REQUIRED.has(selectedProductType.short_code)

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="summary-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )

  return (
    <aside className="side-summary side-summary--wide">
      <div className="side-summary__head">
        <div className="eyebrow">Live summary</div>
        <div className="tt">Your order, as you go</div>
      </div>
      <div className="side-summary__body">
        <Row
          k="PO"
          v={fields.clientPo || <em>Not yet entered</em>}
        />
        <Row
          k="For"
          v={fields.endCustomerName || <em>Not yet entered</em>}
        />
        <Row
          k="Type"
          v={selectedProductType?.name ?? <em>Not yet selected</em>}
        />
        <Row k="Qty" v={String(fields.quantity)} />
        {needsSize && (
          <Row
            k="Size"
            v={fields.sizeSpec || <em>Not yet entered</em>}
          />
        )}
        <Row
          k="Finish"
          v={finishLabel ?? <em>Not yet selected</em>}
        />
        <Row
          k="Files"
          v={
            stagedFilesCount > 0
              ? `${stagedFilesCount} attached`
              : <em>None yet</em>
          }
        />
      </div>
    </aside>
  )
}

function NextStepsPanel() {
  return (
    <aside className="side-summary side-summary--wide">
      <div className="side-summary__head">
        <div className="eyebrow">What happens next</div>
        <div className="tt">Three steps to a quote</div>
      </div>
      <div className="side-summary__body">
        <div className="summary-row">
          <span className="k">0–2 h</span>
          <span className="v">
            <strong>Confirmation</strong> we received your order
          </span>
        </div>
        <div className="summary-row">
          <span className="k">18–48 h</span>
          <span className="v">
            <strong>CAD review</strong> and free quote
          </span>
        </div>
        <div className="summary-row">
          <span className="k">On approval</span>
          <span className="v">
            <strong>Production</strong> begins
          </span>
        </div>
      </div>
    </aside>
  )
}
