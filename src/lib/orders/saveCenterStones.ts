"use server"

// ============================================================
// saveCenterStones Server Action — Phase 2C Sub-session 4 refactor.
//
// Cookie-bound client. RPC name + params unchanged. The
// save_order_center_stones RPC body (migration 17) now runs
// assert_can_modify_order() at the top — raises SQLSTATE 42501 if
// the caller can't modify the order.
//
// CALLER RESPONSIBILITY: filter incomplete rows before sending. The
// RPC trusts that every payload element has non-null stone_type_id,
// stone_shape_id, and supply_source (all of those columns enforce
// constraints at the table level). Partial rows live in client state
// only; they aren't persisted until the customer fills the required
// fields.
// ============================================================

import { createClient } from "@/lib/supabase/server"

// Supply source mirrors the DB enum supply_source (customer | diaco | mixed).
// Re-export from saveDraft would also work; kept inline to avoid coupling.
export type StoneSupply = "customer" | "diaco" | "mixed"

// Min/max range strings are passed straight through to the RPC, which
// uses nullif() to coerce empty strings to NULL and ::numeric to cast
// the carat fields. Color / clarity / make / certification are text.
//
// stone_shape_id is nullable since Type='Other' rows don't carry a shape.
// length_mm / width_mm / depth_mm are populated only when supply='customer'.
// custom_stone_type_name is populated only when Type='Other'.
export interface CenterStoneRowPayload {
  display_order: number
  stone_type_id: string
  stone_shape_id: string | null
  supply_source: StoneSupply
  carat_min: string | null
  carat_max: string | null
  color_min: string | null
  color_max: string | null
  clarity_min: string | null
  clarity_max: string | null
  make_min: string | null
  make_max: string | null
  // Multi-select: array of cert provider names, or null for "unspecified".
  // Migration 25 converted the column from text → text[]; migration 26's
  // RPC casts the JSONB array we send here → text[]. Empty arrays
  // normalize to NULL at the RPC layer.
  certification: string[] | null
  length_mm: string | null
  width_mm: string | null
  depth_mm: string | null
  custom_stone_type_name: string | null
}

export interface SaveCenterStonesResult {
  ok: boolean
  error?: string
}

export async function saveCenterStones(args: {
  orderId: string
  rows: CenterStoneRowPayload[]
}): Promise<SaveCenterStonesResult> {
  const { orderId, rows } = args

  const supabase = await createClient()

  const { error } = await supabase.rpc("save_order_center_stones", {
    p_order_id: orderId,
    p_rows: rows,
  })

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "forbidden: cannot modify this order" }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
