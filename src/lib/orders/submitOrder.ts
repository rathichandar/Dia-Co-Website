"use server"

// ============================================================
// submitOrder Server Action — Phase 2C Sub-session 4 refactor.
//
// Cookie-bound client. Calls the submit_order(p_order_id) RPC (migration
// 16). The RPC asserts caller can modify the order (assert_can_modify_order
// → 42501 if not), validates current status is 'draft' (22023 if not),
// transitions draft → designing + sub_status='awaiting_design', stamps
// submitted_by_user_id = auth.uid() + submitted_at = now(), and appends
// an order_history_events row (event_type='order_submitted',
// actor_side='customer'). The history insert bypasses the (false) RLS
// policy via SECURITY DEFINER — intentional.
//
// ── ERROR TAXONOMY ──────────────────────────────────────────────
// SQLSTATEs from the RPC map to user-facing messages:
//
//   42501 — caller doesn't have permission (RLS / assert violation).
//           Terminal — retry won't help.
//
//   22023 — order's current status isn't 'draft'. The order moved
//           (another tab submitted, AM cancelled, etc.). Terminal —
//           refresh required.
//
//   02000 — order not found (RLS-filtered or genuinely missing).
//           Terminal.
//
//   Other — Postgres / network error. Potentially retriable; surface
//           the raw message for now.
//
// On success returns the order_number when populated by software sync
// — currently always null for portal-only submits (sync hasn't shipped).
// ============================================================

import { createClient } from "@/lib/supabase/server"

export interface SubmitOrderResult {
  ok: boolean
  identifier: string | null
  error?: string
}

export async function submitOrder(args: {
  orderId: string
}): Promise<SubmitOrderResult> {
  const { orderId } = args

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
