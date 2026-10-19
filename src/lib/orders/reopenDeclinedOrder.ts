"use server"

// ============================================================
// reopenDeclinedOrderAction — ERP integration Step 3.
//
// Dia-Co declined an order this customer sent (the ERP's portal_submission_decline). "Edit and send again"
// on the Drafts tab posts here (a <form action>, never a GET — side effects stay behind POST):
//   1. ask the ERP (submissions.list) whether this order's latest receipt really is declined — the Portal
//      never takes the browser's word for it — and read the reason;
//   2. reopen_declined_order moves the Portal's copy back to 'draft', keeping the reason for the form;
//   3. open the order in the form, where the reason is shown at the top.
// Anything unexpected lands back on the Drafts tab, unchanged.
// ============================================================

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { callGateway } from "@/lib/erp/gateway"
import type { ErpSubmission } from "@/lib/erp/erpSubmissions"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function reopenDeclinedOrderAction(formData: FormData): Promise<void> {
  const orderId = String(formData.get("orderId") ?? "").trim()
  if (!UUID.test(orderId)) redirect("/orders?tab=drafts")

  const res = await callGateway<{ ok: true; submissions: ErpSubmission[] }>("submissions.list", {})
  if (!res.ok) {
    console.error("[reopenDeclinedOrder] submissions.list failed:", { code: res.code, status: res.status })
    redirect("/orders?tab=drafts")
  }
  const receipt = res.data.submissions.find((s) => s.portal_order_id === orderId)
  if (!receipt || receipt.status !== "declined") redirect("/orders?tab=drafts")

  const supabase = await createClient()
  const { error } = await supabase.rpc("reopen_declined_order", {
    p_order_id: orderId,
    p_reason: receipt.decline_reason ?? "",
    p_declined_at: receipt.decided_at,
  })
  if (error) {
    console.error("[reopenDeclinedOrder] reopen_declined_order failed:", error.code, error.message)
    redirect("/orders?tab=drafts")
  }

  revalidatePath("/orders")
  redirect(`/orders/new?orderId=${encodeURIComponent(orderId)}`)
}
