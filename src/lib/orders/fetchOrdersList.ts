// ============================================================
// fetchOrdersList — query function for the /orders list page.
// Mirrors the loader pattern from fetchOrder.ts: single PostgREST
// round-trip, then in-JS mapping to a friendly shape.
//
// Returns ALL orders matching the tab so we can render accurate
// counts for the stage filter pills regardless of which one is on.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { computeStatusPill, type StatusPill, type StatusPillKind } from './statusPill'

export type { StatusPill, StatusPillKind }

export type OrdersTab = 'active' | 'cancelled' | 'drafts'
export type StageFilter = 'all' | 'designing' | 'production' | 'late'

export interface OrderListItem {
  orderId: string
  orderNumber: string
  endCustomerName: string | null
  clientPo: string | null
  status: string
  subStatus: string | null
  stageBadgeName: string | null
  statusPill: StatusPill | null
  subStatusText: string
  heroImageUrl: string | null
  price: number | null // dollars; null = "Quote pending"
  expectedShipDate: Date | null
  submittedByName: string | null
  amName: string | null
  updatedAt: Date
}

export interface OrderListResult {
  items: OrderListItem[]
  counts: {
    active: number
    cancelled: number
    all: number // count within the active tab (excludes cancelled)
    designing: number
    production: number
    late: number
  }
}

const ACTIVE_STATUSES = [
  'designing',
  'approved',
  'in_production',
  'qc',
  'shipping',
  'on_hold',
]

// ─── Helpers ──────────────────────────────────────────────────

function stageBadgeNameFor(status: string): string | null {
  switch (status) {
    case 'designing':
      return 'Designing'
    case 'approved':
    case 'in_production':
      return 'Production'
    case 'qc':
      return 'QC'
    case 'shipping':
      return 'Shipping'
    case 'on_hold':
      return 'Designing' // on_hold reflects upstream stage; pill carries the "on hold" signal
    case 'cancelled':
      return null
    default:
      return null
  }
}

function subStatusTextFor(status: string, subStatus: string | null): string {
  if (status === 'designing') {
    switch (subStatus) {
      case 'awaiting_design':
        return 'Design in progress'
      case 'awaiting_review':
        return 'CAD ready — review needed'
      case 'redesigning':
        return 'Working on your changes'
      default:
        return 'Design in progress'
    }
  }
  switch (status) {
    case 'approved':
      return 'Queued for production'
    case 'in_production':
      return 'In production'
    case 'qc':
      return 'Final inspection — shipping soon'
    case 'shipping':
      return 'Shipping'
    case 'on_hold':
      return 'On hold'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

// statusPill logic lives in ./statusPill — single source of truth shared
// with the order detail header.

// ─── Main ────────────────────────────────────────────────────

export async function fetchOrdersList(filters: {
  tab: OrdersTab
  stageFilter: StageFilter
}): Promise<OrderListResult> {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 7-day post-ship grace window: shipped orders stay in Active for a week so
  // customers can track delivery, then auto-move to History.
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffIso = cutoff.toISOString().slice(0, 10) // YYYY-MM-DD
  const activeShipFilter = `actual_ship_date.is.null,actual_ship_date.gte.${cutoffIso}`

  // Base query for the rows. Active tab adds the ship-date OR filter.
  let listQ = supabase
    .from('orders')
    .select(
      `
      id, order_number, end_customer_name, client_po,
      status, sub_status, expected_ship_date, actual_ship_date, updated_at,
      customer:customers!customer_id (id, name, assigned_am_id),
      submitter:users!submitted_by_user_id (full_name),
      am:users!assigned_am_id (full_name),
      cad_versions (
        id, version_number,
        cad_version_renders (image_url, display_order, image_role),
        cad_version_quote_lines (line_total_cents)
      )
      `,
    )
    .in('status', filters.tab === 'active' ? ACTIVE_STATUSES : ['cancelled'])
    .order('updated_at', { ascending: false })
  if (filters.tab === 'active') {
    listQ = listQ.or(activeShipFilter)
  }

  // Counts: active count uses the same status+ship-date rule so the tab
  // badge matches what the query returns.
  const [{ data: orders, error }, activeCountRes, cancelledCountRes] = await Promise.all([
    listQ,
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_STATUSES)
      .or(activeShipFilter),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ])

  if (error) {
    console.error('fetchOrdersList query error:', error.message, error.details)
    return { items: [], counts: emptyCounts() }
  }

  // Map raw rows to OrderListItem.
  const allItems: OrderListItem[] = (orders ?? []).map((o: any): OrderListItem => {
    // Latest CAD version = max version_number
    const versions = [...(o.cad_versions ?? [])].sort(
      (a: any, b: any) => a.version_number - b.version_number,
    )
    const latest = versions[versions.length - 1] ?? null

    // Hero image = first render of latest version (by display_order),
    // preferring image_role='hero' if any.
    let heroImageUrl: string | null = null
    if (latest) {
      const renders = [...(latest.cad_version_renders ?? [])].sort(
        (a: any, b: any) => a.display_order - b.display_order,
      )
      const hero = renders.find((r: any) => r.image_role === 'hero') ?? renders[0]
      heroImageUrl = hero?.image_url ?? null
    }

    // Price = sum of quote line totals for the latest version (in dollars)
    let price: number | null = null
    if (latest) {
      const lines = latest.cad_version_quote_lines ?? []
      if (lines.length > 0) {
        const sum = lines.reduce((s: number, l: any) => s + (l.line_total_cents ?? 0), 0)
        price = sum / 100
      }
    }

    const expectedShipDate = o.expected_ship_date ? new Date(o.expected_ship_date) : null
    const status: string = o.status
    const subStatus: string | null = o.sub_status ?? null

    return {
      orderId: o.id,
      orderNumber: o.order_number,
      endCustomerName: o.end_customer_name ?? null,
      clientPo: o.client_po ?? null,
      status,
      subStatus,
      stageBadgeName: stageBadgeNameFor(status),
      statusPill: computeStatusPill(status, subStatus, expectedShipDate, today),
      subStatusText: subStatusTextFor(status, subStatus),
      heroImageUrl,
      price,
      expectedShipDate,
      submittedByName: o.submitter?.full_name ?? null,
      amName: o.am?.full_name ?? null,
      updatedAt: new Date(o.updated_at),
    }
  })

  // Stage-filter counts (only meaningful within active tab; we always compute them).
  const designingCount = allItems.filter((i) => i.status === 'designing').length
  const productionCount = allItems.filter((i) =>
    ['approved', 'in_production', 'qc', 'shipping'].includes(i.status),
  ).length
  const lateCount = allItems.filter(
    (i) => i.expectedShipDate && i.expectedShipDate < today,
  ).length

  // Apply stage filter.
  let filteredItems = allItems
  if (filters.tab === 'active') {
    if (filters.stageFilter === 'designing') {
      filteredItems = allItems.filter((i) => i.status === 'designing')
    } else if (filters.stageFilter === 'production') {
      filteredItems = allItems.filter((i) =>
        ['approved', 'in_production', 'qc', 'shipping'].includes(i.status),
      )
    } else if (filters.stageFilter === 'late') {
      filteredItems = allItems.filter(
        (i) => i.expectedShipDate && i.expectedShipDate < today,
      )
    }
  }

  return {
    items: filteredItems,
    counts: {
      active: activeCountRes.count ?? 0,
      cancelled: cancelledCountRes.count ?? 0,
      all: allItems.length,
      designing: designingCount,
      production: productionCount,
      late: lateCount,
    },
  }
}

function emptyCounts(): OrderListResult['counts'] {
  return { active: 0, cancelled: 0, all: 0, designing: 0, production: 0, late: 0 }
}
