"use server"

// ============================================================
// submitErpRequest Server Action.
//
// ERP integration Step 4b (ERP_INTEGRATION_CONTRACT.md §9): the customer asks for something on an order read from
// the ERP -- approve the design, changes, Priority Rush, cancel, or (2026-10-23) a question about a change Dia-Co made.
// It changes NOTHING on the order: the ERP files it for an AM, who acts with the ERP's own buttons and marks it done or
// declined, with a note the customer reads (a question is answered by marking it done with the answer as the note).
// A question can be asked on any order not cancelled, one open at a time; a second while one is open is refused.
//   - Who is asking, and for which customer, the ERP decides from the signed-in token (portal-gateway).
//   - An approval names the showing on screen (reviewAt); its version and quote total are read from the ERP's own
//     copy of that showing, and a newer showing sent meanwhile refuses it (PORTAL_STALE).
//   - Sent twice with the same clientKey (one per dialog), it answers the same request.
// On any refusal the ERP's own sentence is shown.
// ============================================================

import { revalidatePath } from "next/cache"
import { callGateway, erpSentence } from "@/lib/erp/gateway"
import type { ErpRequestKind } from "@/types/order"

export interface SubmitErpRequestResult {
  ok: boolean
  error?: string
  // A newer design (or a move by Dia-Co) made this request out of date: the page should be read again.
  stale?: boolean
}

const KINDS: ErpRequestKind[] = ["approve", "modify", "cancel", "rush", "question"]
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function submitErpRequest(args: {
  orderNumber: string
  kind: ErpRequestKind
  text?: string
  reviewAt?: string | null
  clientKey: string
}): Promise<SubmitErpRequestResult> {
  const text = (args.text ?? "").trim()
  if (!args.orderNumber || !KINDS.includes(args.kind) || !UUID.test(args.clientKey)) {
    return { ok: false, error: "This request could not be sent. Refresh the page and try again." }
  }
  if (args.kind === "modify" && !text) {
    return { ok: false, error: "Say what should change." }
  }
  if (args.kind === "question" && !text) {
    return { ok: false, error: "Say what you'd like to ask." }
  }
  if (text.length > 2000) {
    return { ok: false, error: "A request is at most 2,000 characters." }
  }

  const sent = await callGateway<{ ok: true; request_id: string; status: string }>("request.submit", {
    order_no: args.orderNumber,
    kind: args.kind,
    text,
    review_at: args.kind === "approve" ? args.reviewAt ?? null : null,
    client_key: args.clientKey,
  })
  if (!sent.ok) {
    console.error("[submitErpRequest] request.submit refused:", { code: sent.code, status: sent.status })
    return { ok: false, error: erpSentence(sent), stale: sent.code === "PORTAL_STALE" }
  }
  revalidatePath(`/orders/${args.orderNumber}`)
  return { ok: true }
}
