// ============================================================
// fetchDrafts — Step 7 Drafts tab data fetch.
//
// Returns the customer's drafts (status='draft') edited within the
// last 90 days, ordered by updated_at DESC. The 90-day cap is the
// product spec for inactivity expiry — drafts past that window are
// hidden from the UI; actual deletion is deferred to a future cron
// (out of scope this step).
//
// Two predicates kept in code:
//   - status = 'draft'                   (the tab definition)
//   - updated_at > now() - 90 days       (expiry window)
//
// Customer scoping is now handled by RLS (Sub-session 3 — orders SELECT
// policy filters customer-side users to their own customer via
// current_user_customer_id()). The previous explicit .eq("customer_id",
// HARDCODED_CUSTOMER_ID) filter was removed in Sub-session 4.
// ============================================================

import { createClient } from "@/lib/supabase/server"

export interface DraftListItem {
  id: string
  productTypeShortCode: string | null
  productTypeName: string | null
  endCustomerName: string | null
  clientPo: string | null
  finishPoint: string | null
  updatedAt: Date
}

export interface DraftsListResult {
  items: DraftListItem[]
  count: number
}

const DRAFT_WINDOW_DAYS = 90

export async function fetchDrafts(): Promise<DraftsListResult> {
  const supabase = await createClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DRAFT_WINDOW_DAYS)
  const cutoffIso = cutoff.toISOString()

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id, end_customer_name, client_po, finish_point, updated_at,
      product_type:product_types!product_type_id (name, short_code)
      `,
    )
    .eq("status", "draft")
    .gte("updated_at", cutoffIso)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("fetchDrafts query error:", error.message, error.details)
    return { items: [], count: 0 }
  }

  const items: DraftListItem[] = (data ?? []).map((row: any) => ({
    id: row.id,
    productTypeShortCode: row.product_type?.short_code ?? null,
    productTypeName: row.product_type?.name ?? null,
    endCustomerName: row.end_customer_name ?? null,
    clientPo: row.client_po ?? null,
    finishPoint: row.finish_point ?? null,
    updatedAt: new Date(row.updated_at),
  }))

  return { items, count: items.length }
}

// Bare count for the tab badge (used alongside the active+cancelled
// counts in /orders). Same filter as the list query.
export async function fetchDraftsCount(): Promise<number> {
  const supabase = await createClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DRAFT_WINDOW_DAYS)
  const cutoffIso = cutoff.toISOString()

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft")
    .gte("updated_at", cutoffIso)

  if (error) {
    console.error("fetchDraftsCount error:", error.message)
    return 0
  }
  return count ?? 0
}
