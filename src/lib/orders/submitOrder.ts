"use server"

// ============================================================
// submitOrder Server Action.
//
// ERP integration Step 3 (ERP_INTEGRATION_CONTRACT.md §6, §11 Portal 2): when the ERP is connected, Submit
// SENDS the order to Dia-Co instead of moving it along here.
//   1. buildOrderSnapshot reads the draft (and its metals and stones) from the Portal's own tables — RLS
//      scopes it to the caller's customer — and refuses anything that is no longer a draft.
//   2. callGateway('order.submit') sends it. The ERP decides which customer the login belongs to, files it as
//      a Portal draft for an AM, and answers with a receipt. Sent twice, it answers the same receipt.
//   3. record_erp_submission moves the Portal's copy to 'submitted' and keeps the receipt. If that write
//      fails, pressing Submit again is safe: the ERP answers the same receipt and nothing is sent twice.
//   On any refusal the draft stays a draft and the ERP's own sentence is shown.
//
// NOT CONNECTED (ERP_GATEWAY_URL / PORTAL_GATEWAY_SECRET unset — local dev without the ERP): the pre-Step-3
// path, unchanged: submit_order (migration 16) moves draft -> designing.
//
// ── ERROR TAXONOMY (the local path) ─────────────────────────────
//   42501 — caller doesn't have permission (RLS / assert violation).
//   22023 — order's current status isn't 'draft' (another tab submitted it, etc.).
//   02000 — order not found (RLS-filtered or genuinely missing).
//   Other — Postgres / network error; the raw message is surfaced.
// ============================================================

import { createClient } from "@/lib/supabase/server"
import { callGateway, erpConfigured, erpSentence } from "@/lib/erp/gateway"
import { buildOrderSnapshot } from "@/lib/erp/orderSnapshot"

export interface SubmitOrderResult {
  ok: boolean
  identifier: string | null
  sentToErp?: boolean
  error?: string
}

export async function submitOrder(args: {
  orderId: string
}): Promise<SubmitOrderResult> {
  const { orderId } = args
  if (!erpConfigured()) return submitLocally(orderId)

  const snap = await buildOrderSnapshot(orderId)
  if (!snap.ok) return { ok: false, identifier: null, error: snap.error }

  const sent = await callGateway<{ ok: true; submission_id: string; status: string }>("order.submit", {
    order: snap.snapshot,
  })
  if (!sent.ok) {
    console.error("[submitOrder] order.submit refused:", { code: sent.code, status: sent.status })
    return { ok: false, identifier: null, error: erpSentence(sent) }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("record_erp_submission", {
    p_order_id: orderId,
    p_submission_id: sent.data.submission_id,
  })
  if (error) {
    console.error("[submitOrder] record_erp_submission failed:", error.code, error.message)
    return {
      ok: false,
      identifier: null,
      error: "Dia-Co received your order, but this page could not record it. Press Submit again — it will not be sent twice.",
    }
  }
  return { ok: true, identifier: null, sentToErp: true }
}

async function submitLocally(orderId: string): Promise<SubmitOrderResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("submit_order", {
    p_order_id: orderId,
  })

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        identifier: null,
        error: "You don't have permission to submit this order.",
      }
    }
    if (error.code === "22023") {
      return {
        ok: false,
        identifier: null,
        error:
          "This order can no longer be submitted (status changed). Refresh to see current state.",
      }
    }
    if (error.code === "02000") {
      return { ok: false, identifier: null, error: "Order not found." }
    }
    return { ok: false, identifier: null, error: error.message }
  }

  const result = data as
    | { ok?: boolean; order_number?: string | null }
    | null
  return {
    ok: true,
    identifier: result?.order_number ?? null,
  }
}
