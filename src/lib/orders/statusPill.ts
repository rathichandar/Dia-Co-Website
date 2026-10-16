// ============================================================
// Shared status-pill logic — single source of truth for both the
// orders list page and the order detail header.
//
// `computeStatusPill` operates on raw schema values (status enum +
// sub_status + expected_ship_date) and returns the pill (or null
// when no pill should be shown).
//
// `statusPillForOrder` is a thin adapter that converts the mock
// Order type back to schema-ish values and calls computeStatusPill.
// ============================================================

import type { Order } from '@/types/order'

export type StatusPillKind =
  | 'on_hold'
  | 'late'
  | 'needs_review'
  | 'redesigning'
  | 'on_track'

export interface StatusPill {
  kind: StatusPillKind
  label: string
}

const SHIP_TRACKED_STATUSES = ['in_production', 'qc', 'shipping']

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Schema-level pill computation. Both call sites (orders list query +
 * order detail page) funnel through here.
 *
 * Priority order:
 *   1. on_hold (overrides everything)
 *   2. late — only when in production/qc/shipping AND ship date < today
 *   3. needs_review — designing + awaiting_review
 *   4. redesigning — designing + redesigning
 *   5. on_track — only when in production/qc/shipping AND ship date >= today
 *   6. otherwise null
 */
export function computeStatusPill(
  status: string,
  subStatus: string | null,
  expectedShipDate: Date | null,
  today: Date = new Date(),
): StatusPill | null {
  if (status === 'on_hold') {
    return { kind: 'on_hold', label: 'On hold' }
  }
  if (
    SHIP_TRACKED_STATUSES.includes(status) &&
    expectedShipDate &&
    expectedShipDate < today
  ) {
    const days = daysBetween(today, expectedShipDate)
    return { kind: 'late', label: `Late · +${days}d` }
  }
  if (status === 'designing' && subStatus === 'awaiting_review') {
    return { kind: 'needs_review', label: 'Needs review' }
  }
  if (status === 'designing' && subStatus === 'redesigning') {
    return { kind: 'redesigning', label: 'Redesigning' }
  }
  if (
    SHIP_TRACKED_STATUSES.includes(status) &&
    expectedShipDate &&
    expectedShipDate >= today
  ) {
    return { kind: 'on_track', label: 'On track' }
  }
  return null
}

/**
 * Order-typed adapter. Maps the mock Order type's Stage / stageDetail
 * values back to schema-ish strings so we can run the same rules.
 */
export function statusPillForOrder(
  order: Order,
  today: Date = new Date(),
): StatusPill | null {
  // Map Order.currentStage (mock) → schema status string.
  const stageToStatus: Record<string, string> = {
    draft: 'draft',
    designing: 'designing',
    production: 'in_production',
    qc: 'qc',
    shipping: 'shipping',
    completed: 'shipping', // no pill case; closest semantic
    cancelled: 'cancelled',
  }
  const status = stageToStatus[order.currentStage] ?? order.currentStage

  // Map designing sub-state back to schema sub_status. Only matters when
  // status === 'designing'; otherwise computeStatusPill ignores it.
  let subStatus: string | null = null
  if (order.stageDetail.kind === 'designing') {
    const subMap: Record<string, string> = {
      awaiting_first_cad: 'awaiting_design',
      awaiting_customer_review: 'awaiting_review',
      awaiting_modifications: 'redesigning',
      approved: 'awaiting_review',
    }
    subStatus = subMap[order.stageDetail.subState] ?? null
  }

  const expectedShipDate = order.expectedShipDate?.start ?? null

  return computeStatusPill(status, subStatus, expectedShipDate, today)
}
