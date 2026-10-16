// ============================================================
// submitValidation.ts
//
// Pure validator for the Order Entry form's submit-time requirements.
// Called from the form (every render) to drive section-header warning
// icons and the Submit button's enabled state. Also safe to call from
// the submit server action as a defense-in-depth pre-check.
//
// Rules per PROJECT_CONTEXT.md §16. Returned strings are the labels
// shown in section-header tooltips:
//   - Verbatim <label> text where the literal label fits a tooltip
//     ("Description", "Finish point", "Recipient name", etc.)
//   - Short virtual labels where the literal label is too long
//     (gate questions → "Center stones" / "Accent stones") or where
//     multiple fields roll up into one ("Customer reference" for the
//     PO-OR-name rule, "Metal" for the has-≥1-row check).
//
// Format errors and missing-value errors both surface as the same
// label string (e.g. invalid ZIP and empty ZIP both produce "ZIP").
// Tooltip is a scan affordance; field-level errors explain the
// constraint. Clean separation by design.
//
// ── EXTRACTION NOTE ─────────────────────────────────────────────
// The per-row helpers (missing*StoneFields, is*StoneRowComplete) and
// their row types previously lived inline in NewOrderForm.tsx. They
// moved here so per-row warning icons and section-header rollup
// warnings can't drift — both call the same function. NewOrderForm
// imports its row types and helpers from this module.
// ============================================================

import type {
  HasStones,
  EngravingPosition,
  ShippingMethod,
} from "./saveDraft"
import type { StoneSupply } from "./saveCenterStones"
import { US_STATES } from "@/lib/usStates"

// ── Row types (canonical home) ───────────────────────────────────

export type CenterStoneTopType =
  | "natural_diamond"
  | "lab_diamond"
  | "color_stone"
  | "other"

export interface CenterStoneRow {
  topType: CenterStoneTopType | null
  stoneTypeId: string | null
  shapeId: string | null
  supplySource: StoneSupply | null
  caratMin: string
  caratMax: string
  colorMin: string | null
  colorMax: string | null
  clarityMin: string | null
  clarityMax: string | null
  makeMin: string | null
  makeMax: string | null
  certification: string[] | null
  lengthMm: string
  widthMm: string
  depthMm: string
  customStoneTypeName: string
}

export type AccentStoneTopType =
  | "natural_diamond"
  | "lab_diamond"
  | "color_stone"

export interface AccentStoneRow {
  topType: AccentStoneTopType | null
  subType: string | null
  supplySource: StoneSupply | null
  qualityColor: string | null
  qualityClarity: string | null
}

// Minimal metal-row shape this module reads. NewOrderForm's full
// MetalRow type (with `area` + `finish`) stays in NewOrderForm; the
// validator only needs metal_id to detect a "complete" row.
export interface MetalRowValidation {
  metal_id: string | null
}

// ── Per-row helpers (canonical) ──────────────────────────────────
// Used by both NewOrderForm's per-row warning icons and the section
// rollup below. Order of fields in the returned array is the
// tooltip readout order.

export function missingCenterStoneFields(row: CenterStoneRow): string[] {
  const missing: string[] = []
  if (row.topType === null) {
    missing.push("Type")
  } else if (row.topType === "other") {
    if (!row.customStoneTypeName.trim()) missing.push("Description")
  } else {
    if (row.topType === "color_stone" && !row.stoneTypeId) {
      missing.push("Sub-type")
    }
    if (!row.shapeId) missing.push("Shape")
  }
  if (row.supplySource === null) missing.push("Supply")
  return missing
}

export function isCenterStoneRowComplete(row: CenterStoneRow): boolean {
  return missingCenterStoneFields(row).length === 0
}

export function missingAccentStoneFields(row: AccentStoneRow): string[] {
  const missing: string[] = []
  if (row.topType === null) {
    missing.push("Type")
  } else if (row.topType === "color_stone" && !row.subType) {
    missing.push("Sub-type")
  }
  if (row.supplySource === null) missing.push("Supply")
  // Natural Diamond + Dia-Co require Color + Clarity. Lab Diamond is
  // auto-set so it's never missing. Color stones / Other / customer-
  // supplied / mixed have no quality requirement.
  if (row.topType === "natural_diamond" && row.supplySource === "diaco") {
    if (!row.qualityColor) missing.push("Color")
    if (!row.qualityClarity) missing.push("Clarity")
  }
  return missing
}

export function isAccentStoneRowComplete(row: AccentStoneRow): boolean {
  return missingAccentStoneFields(row).length === 0
}

// ── Top-level validator ──────────────────────────────────────────

export type FinishPoint =
  | "file"
  | "wax"
  | "raw_casting"
  | "polished_mounting"
  | "finished_piece"

// Narrow projection of the form's full state. Keeps the validator
// decoupled from NewOrderForm's internal FormFields type (which
// carries UI-only fields like expanded indices we don't read).
export interface ValidationInput {
  clientPo: string
  endCustomerName: string
  productTypeShortCode: string | null
  sizeSpec: string
  finishPoint: FinishPoint | null
  description: string
  engravingText: string
  engravingUseLogo: boolean
  engravingLogoPosition: EngravingPosition | null
  engravingTextPosition: EngravingPosition | null
  shippingMethod: ShippingMethod | null
  shipToRecipientName: string
  shipToAddressLine1: string
  shipToCity: string
  shipToState: string
  shipToPostalCode: string
  shipToCountry: string
  shipToPhone: string
  metals: MetalRowValidation[]
  hasCenterStones: HasStones | null
  centerStones: CenterStoneRow[]
  hasAccentStones: HasStones | null
  accentStones: AccentStoneRow[]
}

// Product-type short_codes that require a size_spec (per §16).
const SIZE_REQUIRED_PRODUCT_CODES = new Set(["R", "BR", "N"])

// Product-type short_codes that show Section 05 (center stones).
// Keep in sync with PRODUCT_TYPES_WITH_CENTER_STONES in NewOrderForm.tsx.
const CENTER_STONE_PRODUCT_CODES = new Set(["R", "P", "E", "N", "O"])

// Finish points that show Section 04 (metals).
const METAL_REQUIRED_FINISH_POINTS = new Set<FinishPoint>([
  "raw_casting",
  "polished_mounting",
  "finished_piece",
])

const US_STATE_CODES = new Set(US_STATES.map((s) => s.value))
const ZIP_REGEX = /^\d{5}$/
const PHONE_DIGITS_REGEX = /^\d{10}$/

// ── Per-section validators ───────────────────────────────────────
// Each returns string[] of labels. Empty array = section satisfied
// (or not visible). Sections 03 and 09 have no required fields and
// don't appear here.

function validateSection01(f: ValidationInput): string[] {
  const missing: string[] = []
  const hasCustomerRef =
    f.clientPo.trim().length > 0 || f.endCustomerName.trim().length > 0
  if (!hasCustomerRef) missing.push("Customer reference")
  if (!f.productTypeShortCode) missing.push("Product type")
  if (
    f.productTypeShortCode &&
    SIZE_REQUIRED_PRODUCT_CODES.has(f.productTypeShortCode) &&
    !f.sizeSpec.trim()
  ) {
    missing.push("Size")
  }
  return missing
}

// Section 02 in the live UI is "Describe the piece" — description
// only. Finish point lives in its own Section 03 (split from §16's
// lumped-together version; §18 will be updated to match the live
// section numbering).
function validateSection02(f: ValidationInput): string[] {
  const missing: string[] = []
  if (!f.description.trim()) missing.push("Description")
  return missing
}

// Section 03 — Finish point picker. Required at submit.
function validateSection03(f: ValidationInput): string[] {
  const missing: string[] = []
  if (!f.finishPoint) missing.push("Finish point")
  return missing
}

function validateSection04(f: ValidationInput): string[] {
  if (!f.finishPoint || !METAL_REQUIRED_FINISH_POINTS.has(f.finishPoint)) {
    return [] // section hidden
  }
  // "Karat + color required" per §16. Master metal_id encodes both
  // (picking "14k Yellow Gold" satisfies both at once). Finish is
  // explicitly NOT required.
  const hasCompleteRow = f.metals.some((r) => r.metal_id !== null)
  return hasCompleteRow ? [] : ["Metal"]
}

function validateSection05(f: ValidationInput): string[] {
  if (f.finishPoint !== "finished_piece") return []
  if (
    !f.productTypeShortCode ||
    !CENTER_STONE_PRODUCT_CODES.has(f.productTypeShortCode)
  ) {
    return []
  }
  if (f.hasCenterStones === null) return ["Center stones"]
  if (f.hasCenterStones !== "yes") return [] // 'no' or 'tbd' → done
  // gate='yes' → at least one row, and any incomplete row contributes
  // its missing fields (interpretation 3 — strict, matches §18 rollup
  // rule).
  if (f.centerStones.length === 0) return ["Center stones"]
  const allMissing = new Set<string>()
  for (const row of f.centerStones) {
    for (const fld of missingCenterStoneFields(row)) {
      allMissing.add(fld)
    }
  }
  return Array.from(allMissing)
}

function validateSection06(f: ValidationInput): string[] {
  if (f.finishPoint !== "finished_piece") return []
  if (f.hasAccentStones === null) return ["Accent stones"]
  if (f.hasAccentStones !== "yes") return []
  if (f.accentStones.length === 0) return ["Accent stones"]
  const allMissing = new Set<string>()
  for (const row of f.accentStones) {
    for (const fld of missingAccentStoneFields(row)) {
      allMissing.add(fld)
    }
  }
  return Array.from(allMissing)
}

function validateSection07(f: ValidationInput): string[] {
  if (
    f.finishPoint !== "polished_mounting" &&
    f.finishPoint !== "finished_piece"
  ) {
    return []
  }
  const missing: string[] = []
  if (f.engravingUseLogo && !f.engravingLogoPosition) {
    missing.push("Logo position")
  }
  if (f.engravingText.trim() && !f.engravingTextPosition) {
    missing.push("Text position")
  }
  return missing
}

function validateSection08(f: ValidationInput): string[] {
  if (!f.shippingMethod) return ["Shipping method"]
  if (
    f.shippingMethod !== "different_address" &&
    f.shippingMethod !== "drop_ship"
  ) {
    return [] // 'standard' uses the account address; no further checks
  }
  const missing: string[] = []
  if (!f.shipToRecipientName.trim()) missing.push("Recipient name")
  if (!f.shipToAddressLine1.trim()) missing.push("Address line 1")
  if (!f.shipToCity.trim()) missing.push("City")
  // State: required AND must be a valid 2-letter code when country=US.
  // Missing-value and format-error both surface as "State".
  const state = f.shipToState.trim()
  if (!state) missing.push("State")
  else if (
    f.shipToCountry === "US" &&
    !US_STATE_CODES.has(state.toUpperCase())
  ) {
    missing.push("State")
  }
  // ZIP: same dual-purpose error.
  const zip = f.shipToPostalCode.trim()
  if (!zip) missing.push("ZIP")
  else if (f.shipToCountry === "US" && !ZIP_REGEX.test(zip)) {
    missing.push("ZIP")
  }
  if (!f.shipToCountry.trim()) missing.push("Country")
  // Phone: 10-digit count check. Format chars are stripped before the
  // regex (formatPhone in NewOrderForm stores as "(NNN) NNN-NNNN").
  const phoneDigits = f.shipToPhone.replace(/\D/g, "")
  if (!phoneDigits || !PHONE_DIGITS_REGEX.test(phoneDigits)) {
    missing.push("Phone")
  }
  return missing
}

// ── Top-level entry ──────────────────────────────────────────────

export interface SubmitValidationResult {
  section01: string[]
  section02: string[]
  section03: string[]
  section04: string[]
  section05: string[]
  section06: string[]
  section07: string[]
  section08: string[]
  isSubmittable: boolean
}

export function validateForSubmit(
  f: ValidationInput,
): SubmitValidationResult {
  const section01 = validateSection01(f)
  const section02 = validateSection02(f)
  const section03 = validateSection03(f)
  const section04 = validateSection04(f)
  const section05 = validateSection05(f)
  const section06 = validateSection06(f)
  const section07 = validateSection07(f)
  const section08 = validateSection08(f)
  const isSubmittable =
    section01.length === 0 &&
    section02.length === 0 &&
    section03.length === 0 &&
    section04.length === 0 &&
    section05.length === 0 &&
    section06.length === 0 &&
    section07.length === 0 &&
    section08.length === 0
  return {
    section01,
    section02,
    section03,
    section04,
    section05,
    section06,
    section07,
    section08,
    isSubmittable,
  }
}
