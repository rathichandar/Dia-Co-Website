"use server"

// ============================================================
// saveDraft Server Action — Phase 2C Sub-session 4 refactor.
//
// Cookie-bound client throughout (no more service-role). The INSERT path
// calls the create_order_draft RPC (migration 15) which atomically inserts
// the order + the creator's order_owners row, derives started_by /
// submitted_by from auth.uid(), and enforces customer-match + place_orders
// capability at the function level. The UPDATE path is a direct
// supabase.from('orders').update() — the orders UPDATE policy gates
// eligibility via current_user_can_update_order() (status in draft/submitted
// + customer match + ownership/view_all). The .eq("status", "draft") filter
// stays as the optimistic-lock check.
//
// Error code 42501 surfaces as "forbidden" — caller can't modify this
// order (RLS or assert violation).
//
// The old single-row discardDraft (soft-cancel) function was REMOVED —
// it was dead code; the in-form Discard flow uses discardSingleDraft from
// discardDrafts.ts (hard delete) per Phase 2B Step 7.
// ============================================================

import { createClient } from "@/lib/supabase/server"

// Shape of fields the form sends. Anything missing is left untouched.
// All optional so partial saves work.
export interface DraftFields {
  client_po?: string | null
  end_customer_name?: string | null
  product_type_short_code?: string | null // form sends string; we resolve to product_type_id here
  quantity?: number | null
  size_spec?: string | null
  finish_point?:
    | "file"
    | "wax"
    | "raw_casting"
    | "polished_mounting"
    | "finished_piece"
    | null
  description?: string | null
  submission_notes?: string | null
  engraving_text?: string | null
  engraving_use_logo?: boolean
  engraving_logo_position?: EngravingPosition | null
  engraving_text_position?: EngravingPosition | null
  // Shipping
  shipping_method?: ShippingMethod | null
  ship_to_recipient_name?: string | null
  ship_to_address_line1?: string | null
  ship_to_address_line2?: string | null
  ship_to_city?: string | null
  ship_to_state?: string | null
  ship_to_postal_code?: string | null
  ship_to_country?: string | null
  ship_to_phone?: string | null
  // Stones gates — tri-state Yes/No/TBD. Null means "not yet answered".
  has_center_stones?: HasStones | null
  has_accent_stones?: HasStones | null
}

// Mirrors the has_stones enum in the DB (migration 16).
export type HasStones = "yes" | "no" | "tbd"

// Mirrors the shipping_method enum in the DB (migration 16).
export type ShippingMethod = "standard" | "different_address" | "drop_ship"

// Mirrors the metal_finish enum in the DB (migration 16).
export type MetalFinish =
  | "high_polish"
  | "matte"
  | "brushed"
  | "satin"
  | "sandblast"
  | "hammered"
  | "antiqued"

// Mirrors the engraving_position enum in the DB (migration 18).
export type EngravingPosition =
  | "inside_shank_top"
  | "inside_shank_bottom"
  | "inside_shank_left"
  | "inside_shank_right"
  | "back_of_bail"
  | "back_of_body"
  | "back_top"
  | "back_middle"
  | "back_bottom"
  | "other"

export interface SaveDraftResult {
  ok: boolean
  id?: string
  updatedAt?: string
  error?: string
}

export async function saveDraft(args: {
  draftId: string | null
  customerId: string
  fields: DraftFields
}): Promise<SaveDraftResult> {
  const { draftId, customerId, fields } = args

  const supabase = await createClient()

  // Resolve product_type_short_code → product_type_id (FK) if present.
  // Drop the short_code field from the payload — schema only has the FK.
  let productTypeId: string | undefined
  if (fields.product_type_short_code) {
    const { data, error } = await supabase
      .from("product_types")
      .select("id")
      .eq("short_code", fields.product_type_short_code)
      .maybeSingle()
    if (error) {
      return { ok: false, error: `product_type lookup failed: ${error.message}` }
    }
    if (data?.id) productTypeId = data.id as string
  }

  // Build the payload, skipping the short_code field. `undefined` is dropped
  // so we don't blow away values the client didn't include in this save.
  const payload: Record<string, unknown> = {}
  const set = <K extends keyof DraftFields>(k: K, v: unknown) => {
    if (v !== undefined) payload[k as string] = v
  }
  set("client_po", fields.client_po)
  set("end_customer_name", fields.end_customer_name)
  set("quantity", fields.quantity)
  set("size_spec", fields.size_spec)
  set("finish_point", fields.finish_point)
  set("description", fields.description)
  set("submission_notes", fields.submission_notes)
  set("engraving_text", fields.engraving_text)
  set("engraving_use_logo", fields.engraving_use_logo)
  set("engraving_logo_position", fields.engraving_logo_position)
  set("engraving_text_position", fields.engraving_text_position)
  set("shipping_method", fields.shipping_method)
  set("ship_to_recipient_name", fields.ship_to_recipient_name)
  set("ship_to_address_line1", fields.ship_to_address_line1)
  set("ship_to_address_line2", fields.ship_to_address_line2)
  set("ship_to_city", fields.ship_to_city)
  set("ship_to_state", fields.ship_to_state)
  set("ship_to_postal_code", fields.ship_to_postal_code)
  set("ship_to_country", fields.ship_to_country)
  set("ship_to_phone", fields.ship_to_phone)
  set("has_center_stones", fields.has_center_stones)
  set("has_accent_stones", fields.has_accent_stones)
  if (productTypeId) payload.product_type_id = productTypeId

  // Mirror create_order_draft RPC's COALESCE behavior for the 3 columns
  // that are NOT NULL DEFAULT. Without this, an autosave UPDATE that
  // includes one of these fields as null/empty would violate the NOT
  // NULL constraint. The RPC's INSERT-side handles this via
  //   coalesce(nullif(p_payload->>'X', '')::T, <default>)
  // — we replicate in JS so the UPDATE path stays consistent.
  if (payload.quantity === null) {
    payload.quantity = 1
  }
  if (payload.engraving_use_logo === null) {
    payload.engraving_use_logo = false
  }
  if (payload.ship_to_country === null || payload.ship_to_country === "") {
    payload.ship_to_country = "US"
  }

  if (draftId) {
    // UPDATE existing draft. orders UPDATE policy + immutability trigger
    // enforce auth; status='draft' filter is the optimistic-lock check.
    const { data, error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", draftId)
      .eq("status", "draft")
      .select("id, updated_at")
      .maybeSingle()
    if (error) {
      if (error.code === "42501") {
        return { ok: false, error: "forbidden: cannot modify this draft" }
      }
      return { ok: false, error: error.message }
    }
    if (!data) {
      return { ok: false, error: "draft not found or no longer editable" }
    }
    return { ok: true, id: data.id, updatedAt: data.updated_at }
  }

  // INSERT path: call create_order_draft RPC. Atomically inserts the order +
  // the creator's order_owners row. Server-side enforces customer match,
  // place_orders capability, and started_by/submitted_by = auth.uid().
  const rpcPayload = {
    ...payload,
    customer_id: customerId,
  }
  const { data, error } = await supabase.rpc("create_order_draft", {
    p_payload: rpcPayload,
  })
  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        error: "forbidden: cannot create order for this customer",
      }
    }
    return { ok: false, error: error.message }
  }
  const result = data as { id?: string; updated_at?: string } | null
  if (!result?.id) {
    return { ok: false, error: "create_order_draft returned no id" }
  }
  return { ok: true, id: result.id, updatedAt: result.updated_at }
}
