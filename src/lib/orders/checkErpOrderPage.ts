"use server"

// ============================================================
// checkErpOrderPage Server Action.
//
// ERP integration Step 4b: a request button on an ERP order's page asks this before its dialog opens. The page
// says what it shows (its status, whether a design waits for review, the newest showing); this reads the same
// from the ERP again. Behind means Dia-Co moved the order since the page loaded (approved the design, sent it
// back, sent a newer version...): the page then refreshes instead of opening a dialog the ERP would refuse
// (PORTAL_STALE). The ERP still checks every request when it is sent; this only spares the customer that refusal.
// null: the ERP could not answer -- the dialog opens as before.
// ============================================================

import { fetchErpReviewState } from "@/lib/erp/erpOrders"

export interface ErpPageView {
  orderNumber: string
  status: string | null
  awaitingReview: boolean
  reviewAt: string | null
}

export async function checkErpOrderPage(view: ErpPageView): Promise<{ behind: boolean } | null> {
  if (!view || typeof view.orderNumber !== "string" || !view.orderNumber || view.orderNumber.length > 40) return null
  const now = await fetchErpReviewState(view.orderNumber)
  if (!now) return null
  return {
    behind:
      now.status !== view.status ||
      now.awaitingReview !== view.awaitingReview ||
      now.latestReviewAt !== (view.reviewAt ?? null),
  }
}
