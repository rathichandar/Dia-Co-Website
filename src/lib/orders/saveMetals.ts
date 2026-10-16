"use server"

// ============================================================
// saveMetals Server Action — Phase 2C Sub-session 4 refactor.
//
// Cookie-bound client. RPC name + params unchanged. The save_order_metals
// RPC body (migration 17) now runs assert_can_modify_order() at the top —
// raises SQLSTATE 42501 if the caller can't modify the order. We map that
// to a user-facing forbidden message.
// ============================================================

import { createClient } from "@/lib/supabase/server"
import type { MetalFinish } from "./saveDraft"

export interface MetalRowPayload {
  metal_id: string // resolved from the dropdown selection to metals.id
  area: string | null
  finish: MetalFinish | null
  display_order: number
}

export interface SaveMetalsResult {
  ok: boolean
  error?: string
}

export async function saveMetals(args: {
  orderId: string
  rows: MetalRowPayload[]
}): Promise<SaveMetalsResult> {
  const { orderId, rows } = args

  const supabase = await createClient()

  const { error } = await supabase.rpc("save_order_metals", {
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
