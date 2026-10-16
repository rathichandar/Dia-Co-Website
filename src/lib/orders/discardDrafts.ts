"use server"

// ============================================================
// discardDrafts — Phase 2C Sub-session 4 refactor.
//
// Hard-deletes draft rows. Cookie-bound client; orders DELETE RLS policy
// gates eligibility:
//
//   (is_customer_side AND own customer AND status='draft'
//    AND (view_all OR ownership))
//   OR is_super_admin
//
// Filters kept (defense in depth even though RLS covers them):
//   - id IN (...)        — caller's selection
//   - status = 'draft'   — prevents accidental live-order delete on race
//
// HARDCODED_CUSTOMER_ID filter DROPPED — RLS scopes to the caller's
// customer via current_user_customer_id() in the orders DELETE policy.
//
// CASCADE on order_metals / order_center_stones / order_accent_stones
// drops their child rows automatically (verified in migration 5).
// order_owners also CASCADE-deletes when its parent order is deleted.
//
// Returns the count of rows actually deleted, which may be less than
// the input length when some IDs no longer match all predicates (RLS
// silently filtered, status changed). Callers can compare to surface
// "N of M deleted" if relevant; today's UI just refreshes via
// router.refresh() so the partial-delete distinction isn't visible.
// ============================================================

import { createClient } from "@/lib/supabase/server"

export interface DiscardDraftsResult {
  ok: boolean
  deletedCount: number
  error?: string
}

export async function discardDrafts(args: {
  orderIds: string[]
}): Promise<DiscardDraftsResult> {
  const { orderIds } = args

  if (orderIds.length === 0) {
    return { ok: true, deletedCount: 0 }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("orders")
    .delete()
    .in("id", orderIds)
    .eq("status", "draft")
    .select("id")

  if (error) {
    return { ok: false, deletedCount: 0, error: error.message }
  }

  return { ok: true, deletedCount: data?.length ?? 0 }
}

// Single-draft hard delete. Used by the in-form Discard flow on
// /orders/new (replaces the old soft-cancel discardDraft). Same
// predicates as the bulk version.
export async function discardSingleDraft(args: {
  orderId: string
}): Promise<DiscardDraftsResult> {
  return discardDrafts({ orderIds: [args.orderId] })
}
