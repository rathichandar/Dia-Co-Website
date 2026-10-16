"use server"

// ============================================================
// saveAccentStones Server Action — Phase 2C Sub-session 4 refactor.
//
// Cookie-bound client. RPC name + params unchanged. The
// save_order_accent_stones RPC body (migration 17) now runs
// assert_can_modify_order() at the top — raises SQLSTATE 42501 if
// the caller can't modify the order.
//
// CALLER RESPONSIBILITY: filter incomplete rows before sending. The
// RPC trusts that every payload element has non-null stone_type_id
// and supply_source (both enforced at the table level). Partial rows
// live in client state only.
//
// Accent rows are minimal by design — no shape, quantity, size, carat,
// or grade fields. Dia-Co fills those in during design. See PHASE_2B_BRIEF.md.
// ============================================================

import { createClient } from "@/lib/supabase/server"
import type { StoneSupply } from "./saveCenterStones"

export interface AccentStoneRowPayload {
  display_order: number
  stone_type_id: string
  supply_source: StoneSupply
  // Quality fields (migration 27 + RPC v2 from migration 28). NULL for
  // any row that isn't a Dia-Co-supplied diamond. Natural diamonds carry
  // the customer's tier picks; Lab diamonds carry the auto values
  // (E/F + VVS) — caller hardcodes those into the payload for safety.
  quality_color: string | null
  quality_clarity: string | null
}

export interface SaveAccentStonesResult {
  ok: boolean
  error?: string
}

export async function saveAccentStones(args: {
  orderId: string
  rows: AccentStoneRowPayload[]
}): Promise<SaveAccentStonesResult> {
  const { orderId, rows } = args

  const supabase = await createClient()

  const { error } = await supabase.rpc("save_order_accent_stones", {
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
