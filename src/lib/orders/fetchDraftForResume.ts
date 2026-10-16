// ============================================================
// fetchDraftForResume — Step 7 resume hydration.
//
// Given an orderId from /orders/new?orderId=, fetches the draft +
// child rows and projects them into NewOrderForm's FormFields shape
// plus the section-touched / accordion / draftId state the form
// needs at mount.
//
// Returns a discriminated union so the page can render error pages
// for the spec's edge cases without leaking which case it hit.
//
// Security layering:
//   1. Defensive UUID-shape check — bails before any DB call on
//      empty / "undefined" string / whitespace / malformed input.
//   2. RLS on orders (Sub-session 3 — orders SELECT policy) — cross-
//      customer orderId returns no rows, which collapses to "not_found"
//      same as a nonexistent id; we don't reveal that a draft exists
//      for someone else.
//   3. Post-fetch status check — exists-but-not-draft returns
//      "wrong_status" with the orderId so the page CTA can deep-
//      link to the detail view.
//
// Stone-type → topType + subType resolution:
//   stone_types.name === 'Other'      → topType='other' (centers only)
//   category='natural_diamond'         → topType='natural_diamond'
//   category='lab_diamond'             → topType='lab_diamond'
//   category='color_stone' (non-Other) → topType='color_stone',
//                                        subType=stone_type_id
//   For accents, Color Stone → Other rides the color_stone category
//   path with subType pointing at the Other master row's id.
//
// has_center_stones / has_accent_stones NULL handling (§17/§21):
//   - column IS NULL + row count > 0   → infer 'yes'
//   - column IS NULL + row count === 0 → leave null
//   - column has value                 → use verbatim
//
// highestSectionTouched inference: returns the max section number
// whose tracked field set has any non-default value. Defaults to 1
// (Section 01 only) when nothing's filled.
//
// Accordion expansion: rows present → expand row 1; rows empty →
// null. Customer always lands on row 1 expanded.
// ============================================================

import { createClient } from "@/lib/supabase/server"
import {
  INITIAL_FIELDS,
  type FormFields,
  type MetalRow,
} from "./formInitial"
import type {
  CenterStoneRow,
  CenterStoneTopType,
  AccentStoneRow,
  AccentStoneTopType,
} from "./submitValidation"

// Standard 8-4-4-4-12 hex UUID. Case-insensitive. Rejects empty
// string, the literal "undefined" string, whitespace-only input,
// and anything that isn't this exact shape — before any DB call.
// Supabase would error noisily on a bad uuid; we surface
// "not_found" to keep the customer flow clean.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface InitialDraft {
  draftId: string
  formFields: FormFields
  expandedCenterStoneIndex: number | null
  expandedAccentStoneIndex: number | null
  highestSectionTouched: number
}

export type DraftResumeResult =
  | { kind: "ok"; initialDraft: InitialDraft }
  | { kind: "not_found" }
  | { kind: "wrong_status"; orderId: string }

export async function fetchDraftForResume(
  orderId: string | undefined,
): Promise<DraftResumeResult> {
  if (
    !orderId ||
    typeof orderId !== "string" ||
    !UUID_REGEX.test(orderId.trim())
  ) {
    return { kind: "not_found" }
  }

  const supabase = await createClient()

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      `
      id, status, client_po, end_customer_name, quantity, size_spec,
      finish_point, description, submission_notes,
      engraving_text, engraving_use_logo,
      engraving_logo_position, engraving_text_position,
      shipping_method, ship_to_recipient_name, ship_to_address_line1,
      ship_to_address_line2, ship_to_city, ship_to_state,
      ship_to_postal_code, ship_to_country, ship_to_phone,
      has_center_stones, has_accent_stones,
      product_type:product_types!product_type_id (short_code)
      `,
    )
    .eq("id", orderId)
    .maybeSingle()

  if (orderErr) {
    console.error(
      "fetchDraftForResume order query error:",
      orderErr.message,
    )
    return { kind: "not_found" }
  }
  if (!order) return { kind: "not_found" }
  if (order.status !== "draft") {
    return { kind: "wrong_status", orderId: order.id as string }
  }

  const [metalsRes, centersRes, accentsRes] = await Promise.all([
    supabase
      .from("order_metals")
      .select("metal_id, area, finish, display_order")
      .eq("order_id", orderId)
      .order("display_order", { ascending: true }),
    supabase
      .from("order_center_stones")
      .select(
        `
        stone_type_id, stone_shape_id, supply_source,
        carat_min, carat_max, color_min, color_max,
        clarity_min, clarity_max, make_min, make_max,
        certification, length_mm, width_mm, depth_mm,
        custom_stone_type_name, display_order,
        stone_type:stone_types!stone_type_id (name, category)
        `,
      )
      .eq("order_id", orderId)
      .order("display_order", { ascending: true }),
    supabase
      .from("order_accent_stones")
      .select(
        `
        stone_type_id, supply_source, quality_color, quality_clarity,
        display_order,
        stone_type:stone_types!stone_type_id (name, category)
        `,
      )
      .eq("order_id", orderId)
      .order("display_order", { ascending: true }),
  ])

  if (metalsRes.error || centersRes.error || accentsRes.error) {
    console.error(
      "fetchDraftForResume child query error:",
      metalsRes.error?.message ??
        centersRes.error?.message ??
        accentsRes.error?.message,
    )
    return { kind: "not_found" }
  }

  // Form expects ≥1 metal row in state. If the DB has zero rows
  // (Section 04 wasn't visited or visible), seed an empty placeholder.
  const metalsRaw = metalsRes.data ?? []
  const metals: MetalRow[] =
    metalsRaw.length === 0
      ? [{ metal_id: null, area: "", finish: null }]
      : metalsRaw.map((r: any) => ({
          metal_id: r.metal_id ?? null,
          area: r.area ?? "",
          finish: r.finish ?? null,
        }))

  const centerStones: CenterStoneRow[] = (centersRes.data ?? []).map(
    (r: any) => projectCenterStone(r),
  )
  const accentStones: AccentStoneRow[] = (accentsRes.data ?? []).map(
    (r: any) => projectAccentStone(r),
  )

  const hasCenterStones = inferHasStones(
    order.has_center_stones as "yes" | "no" | "tbd" | null,
    centerStones.length,
  )
  const hasAccentStones = inferHasStones(
    order.has_accent_stones as "yes" | "no" | "tbd" | null,
    accentStones.length,
  )

  const formFields: FormFields = {
    ...INITIAL_FIELDS,
    clientPo: order.client_po ?? "",
    endCustomerName: order.end_customer_name ?? "",
    productTypeShortCode:
      (order.product_type as any)?.short_code ?? null,
    quantity: order.quantity ?? 1,
    sizeSpec: order.size_spec ?? "",
    finishPoint: order.finish_point ?? null,
    description: order.description ?? "",
    submissionNotes: order.submission_notes ?? "",
    engravingText: order.engraving_text ?? "",
    engravingUseLogo: order.engraving_use_logo ?? false,
    engravingLogoPosition: order.engraving_logo_position ?? null,
    engravingTextPosition: order.engraving_text_position ?? null,
    shippingMethod: order.shipping_method ?? null,
    shipToRecipientName: order.ship_to_recipient_name ?? "",
    shipToAddressLine1: order.ship_to_address_line1 ?? "",
    shipToAddressLine2: order.ship_to_address_line2 ?? "",
    shipToCity: order.ship_to_city ?? "",
    shipToState: order.ship_to_state ?? "",
    shipToPostalCode: order.ship_to_postal_code ?? "",
    shipToCountry: order.ship_to_country ?? "US",
    shipToPhone: order.ship_to_phone ?? "",
    metals,
    hasCenterStones,
    centerStones,
    hasAccentStones,
    accentStones,
  }

  return {
    kind: "ok",
    initialDraft: {
      draftId: order.id as string,
      formFields,
      expandedCenterStoneIndex: centerStones.length > 0 ? 0 : null,
      expandedAccentStoneIndex: accentStones.length > 0 ? 0 : null,
      highestSectionTouched: inferHighestSectionTouched(formFields),
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function inferHasStones(
  column: "yes" | "no" | "tbd" | null,
  rowCount: number,
): "yes" | "no" | "tbd" | null {
  if (column !== null) return column
  return rowCount > 0 ? "yes" : null
}

function projectCenterStone(row: any): CenterStoneRow {
  const stoneTypeId = row.stone_type_id as string
  const name = row.stone_type?.name as string | undefined
  const category = row.stone_type?.category as string | undefined

  let topType: CenterStoneTopType
  if (name === "Other") topType = "other"
  else if (category === "natural_diamond") topType = "natural_diamond"
  else if (category === "lab_diamond") topType = "lab_diamond"
  else topType = "color_stone"

  return {
    topType,
    stoneTypeId,
    shapeId: (row.stone_shape_id as string | null) ?? null,
    supplySource:
      (row.supply_source as CenterStoneRow["supplySource"]) ?? null,
    caratMin: row.carat_min != null ? String(row.carat_min) : "",
    caratMax: row.carat_max != null ? String(row.carat_max) : "",
    colorMin: row.color_min ?? null,
    colorMax: row.color_max ?? null,
    clarityMin: row.clarity_min ?? null,
    clarityMax: row.clarity_max ?? null,
    makeMin: row.make_min ?? null,
    makeMax: row.make_max ?? null,
    certification: row.certification ?? null,
    lengthMm: row.length_mm != null ? String(row.length_mm) : "",
    widthMm: row.width_mm != null ? String(row.width_mm) : "",
    depthMm: row.depth_mm != null ? String(row.depth_mm) : "",
    customStoneTypeName: row.custom_stone_type_name ?? "",
  }
}

function projectAccentStone(row: any): AccentStoneRow {
  const stoneTypeId = row.stone_type_id as string
  const category = row.stone_type?.category as string | undefined

  let topType: AccentStoneTopType
  let subType: string | null
  if (category === "natural_diamond") {
    topType = "natural_diamond"
    subType = null
  } else if (category === "lab_diamond") {
    topType = "lab_diamond"
    subType = null
  } else {
    topType = "color_stone"
    subType = stoneTypeId
  }

  return {
    topType,
    subType,
    supplySource:
      (row.supply_source as AccentStoneRow["supplySource"]) ?? null,
    qualityColor: row.quality_color ?? null,
    qualityClarity: row.quality_clarity ?? null,
  }
}

// Walk the section-touched rules per spec §17. Returns the max
// section number with anything filled. Defaults to 1 if nothing's
// filled (Section 01 is the implicit landing target). Section
// numbering matches the live UI post-Step-6 fix: Description=02,
// Finish point=03.
function inferHighestSectionTouched(f: FormFields): number {
  let highest = 1
  if (
    f.clientPo ||
    f.endCustomerName ||
    f.productTypeShortCode ||
    f.sizeSpec ||
    f.quantity !== 1
  ) {
    highest = Math.max(highest, 1)
  }
  if (f.description) highest = Math.max(highest, 2)
  if (f.finishPoint) highest = Math.max(highest, 3)
  if (f.metals.some((m) => m.metal_id !== null)) {
    highest = Math.max(highest, 4)
  }
  if (f.hasCenterStones !== null || f.centerStones.length > 0) {
    highest = Math.max(highest, 5)
  }
  if (f.hasAccentStones !== null || f.accentStones.length > 0) {
    highest = Math.max(highest, 6)
  }
  if (f.engravingText || f.engravingUseLogo) {
    highest = Math.max(highest, 7)
  }
  if (f.shippingMethod) highest = Math.max(highest, 8)
  if (f.submissionNotes) highest = Math.max(highest, 9)
  return highest
}
