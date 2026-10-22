// ============================================================
// A linked customer's orders, read from the ERP (ERP_INTEGRATION_CONTRACT.md §5, §7 — Step 2).
//
// The ERP is the system of record. For a Portal login the ERP has linked to a customer, the order list
// and the order page read through the gateway (orders.list / order.get) and are mapped here into the
// Portal's existing shapes, so the pages and components render them unchanged.
//
// The ERP already did the translating (owner rulings 2026-10-16): status is in the Portal's own words
// (designing | approved | in_production | qc | shipping | on_hold | cancelled + sub_status) — D2; an
// invoiced order arrives as shipping with shipped=true and its invoice day — D4; the list holds open
// orders plus the last 12 months — D11; the ship date is already the customer's date (+2 business days).
// Nothing here recomputes any of that.
//
// `null` from these functions means "no ERP answer for this login" (not configured, or not linked):
// callers fall back to the Portal's own tables, exactly as before Step 2.
// ============================================================

import { cache } from 'react'
import { callGateway } from './gateway'
import { loadSubmissionState, type SentOrder } from './erpSubmissions'
import { computeStatusPill } from '@/lib/orders/statusPill'
import type { OrderListItem, OrderListResult, OrdersTab, StageFilter } from '@/lib/orders/fetchOrdersList'
import type {
  AccountManager,
  AccountManagerId,
  CadVersion,
  Customer,
  CustomerId,
  DesigningSubState,
  ErpQuote,
  ErpRequest,
  FinishPoint,
  MetalColorId,
  MetalKaratId,
  MetalSpec,
  Order,
  OrderId,
  ProductType,
  Stage,
  StageDetail,
} from '@/types/order'

export type ErpPortalStatus = 'designing' | 'approved' | 'in_production' | 'qc' | 'shipping' | 'on_hold' | 'cancelled'

// One order exactly as the ERP's _portal_order_json sends it (its allowlist).
export interface ErpOrder {
  order_no: string
  style_no: string | null
  style: string | null
  finish_point: FinishPoint | null
  status: ErpPortalStatus
  sub_status: 'awaiting_design' | 'awaiting_review' | 'redesigning' | null
  shipped: boolean
  shipped_on: string | null
  customer_ship_date: string | null
  ordered_on: string | null
  cancelled_on: string | null
  ref_po: string | null
  // The order's end customer as the ERP holds it (typed by Dia-Co, or brought from the Portal at intake). Absent from
  // a gateway older than db/2026-10-22-portal-end-customer.sql.
  end_customer?: string | null
  quantity: number
  size: string | null
  metals: string[]
  customer_name: string | null
  updated_at: string | null
}

// Codes that mean "this login has no ERP orders to show" -> the Portal's own tables answer, quietly.
// Any OTHER failure (the ERP unreachable, or a gateway older than this code) also falls back -- an
// empty orders page would be worse than the Portal's own view -- but is logged.
const EXPECTED_NO_ERP = new Set(['PORTAL_NOT_CONFIGURED', 'PORTAL_FORBIDDEN'])

// Shipped orders stay on the Active tab this many days, as the Portal already does for its own.
const SHIPPED_GRACE_DAYS = 7

// A calendar day from the ERP ('YYYY-MM-DD') as local noon, so it prints as the same day in any timezone.
function day(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

function startOfToday(): Date {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

function stageBadge(o: ErpOrder): string | null {
  switch (o.status) {
    case 'designing':
      return 'Designing'
    case 'approved':
    case 'in_production':
    case 'on_hold':
      return 'Production'
    case 'qc':
      return 'QC'
    case 'shipping':
      return o.shipped ? 'Shipped' : 'Shipping'
    default:
      return null
  }
}

const SHORT_DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

function statusText(o: ErpOrder): string {
  switch (o.status) {
    case 'designing':
      return o.sub_status === 'awaiting_review'
        ? 'CAD ready — review needed'
        : o.sub_status === 'redesigning'
          ? 'Working on your changes'
          : 'Design in progress'
    case 'approved':
      return 'Queued for production'
    case 'in_production':
      return 'In production'
    case 'qc':
      return 'Final inspection — shipping soon'
    case 'shipping': {
      const shippedOn = day(o.shipped_on)
      return o.shipped ? (shippedOn ? `Shipped ${SHORT_DATE.format(shippedOn)}` : 'Shipped') : 'Final checks done — preparing to ship'
    }
    case 'on_hold':
      return 'On hold'
    case 'cancelled':
      return 'Cancelled'
  }
}

function productLabel(o: ErpOrder): string | null {
  const parts = [o.style, o.metals[0]].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function toListItem(o: ErpOrder, today: Date): OrderListItem {
  // A shipped order is never late: it has no ship date still to meet.
  const expectedShipDate = o.shipped ? null : day(o.customer_ship_date)
  return {
    orderId: o.order_no,
    orderNumber: o.order_no,
    endCustomerName: o.end_customer ?? null,
    productLabel: productLabel(o),
    clientPo: o.ref_po,
    status: o.status,
    subStatus: o.sub_status,
    stageBadgeName: stageBadge(o),
    statusPill: computeStatusPill(o.status, o.sub_status, expectedShipDate, today),
    subStatusText: statusText(o),
    heroImageUrl: null, // CAD renders arrive in Step 4
    price: null,
    priceHidden: true, // the quote arrives in Step 4; "Quote pending" would be wrong for an order in production
    expectedShipDate,
    submittedByName: null,
    amName: null,
    updatedAt: o.updated_at ? new Date(o.updated_at) : new Date(0),
  }
}

// Step 3 — an order this customer sent that Dia-Co has not created yet: the Portal's own copy, as a
// "Received" card. It has no order number (an AM issues one at Create), so it has no order page either.
function receivedItem(o: SentOrder): OrderListItem {
  return {
    orderId: o.id,
    orderNumber: '',
    endCustomerName: o.endCustomerName,
    productLabel: o.productTypeName,
    clientPo: o.clientPo,
    status: 'submitted',
    subStatus: null,
    stageBadgeName: null,
    statusPill: { kind: 'received', label: 'Received' },
    subStatusText: 'Dia-Co is checking your order',
    heroImageUrl: null,
    price: null, // "Quote pending" — which it is
    expectedShipDate: null,
    submittedByName: o.submittedByName,
    amName: null,
    updatedAt: o.submittedAt ?? o.updatedAt,
  }
}

// ─── The list ───────────────────────────────────────────────

export async function fetchErpOrdersList(filters: {
  tab: OrdersTab
  stageFilter: StageFilter
}): Promise<OrderListResult | null> {
  const res = await callGateway<{ ok: true; orders: ErpOrder[]; total: number }>('orders.list', { filter: 'all', limit: 500 })
  if (!res.ok) {
    if (!EXPECTED_NO_ERP.has(res.code)) {
      console.error('[erpOrders] orders.list failed; showing the Portal\'s own orders:', { code: res.code, message: res.message })
    }
    return null
  }

  const today = startOfToday()
  const graceStart = new Date(today)
  graceStart.setDate(graceStart.getDate() - SHIPPED_GRACE_DAYS)

  // Step 3 — what became of the orders this customer sent (one gateway call, only when there are any).
  const sent = await loadSubmissionState()
  const all = res.data.orders.map((o) => {
    const item = toListItem(o, today)
    // Created from an order this customer sent: who sent it, and their own end customer when the ERP holds none.
    const mine = sent.converted.get(o.order_no)
    if (mine) {
      item.endCustomerName = item.endCustomerName ?? mine.endCustomerName
      item.submittedByName = mine.submittedByName
    }
    return { o, item }
  })
  const isActive = ({ o }: { o: ErpOrder }) =>
    o.status !== 'cancelled' && (!o.shipped || (day(o.shipped_on) ?? new Date(0)) >= graceStart)
  const active = [...sent.received.map(receivedItem), ...all.filter(isActive).map((x) => x.item)]
  const cancelled = all.filter(({ o }) => o.status === 'cancelled').map((x) => x.item)

  const inProduction = (i: OrderListItem) => ['approved', 'in_production', 'qc', 'shipping', 'on_hold'].includes(i.status)
  const isLate = (i: OrderListItem) => !!i.expectedShipDate && i.expectedShipDate < today

  let items = filters.tab === 'cancelled' ? cancelled : active
  if (filters.tab === 'active') {
    if (filters.stageFilter === 'designing') items = active.filter((i) => i.status === 'designing')
    else if (filters.stageFilter === 'production') items = active.filter(inProduction)
    else if (filters.stageFilter === 'late') items = active.filter(isLate)
  }

  return {
    items,
    counts: {
      active: active.length,
      cancelled: cancelled.length,
      all: active.length,
      designing: active.filter((i) => i.status === 'designing').length,
      production: active.filter(inProduction).length,
      late: active.filter(isLate).length,
    },
  }
}

// ─── One order ──────────────────────────────────────────────

const brand = <T,>(s: string) => s as T

function productType(style: string | null): ProductType {
  switch ((style ?? '').toLowerCase()) {
    case 'ring':
      return 'ring'
    case 'earring':
      return 'earrings'
    case 'pendant':
      return 'pendant'
    case 'necklace':
      return 'necklace'
    case 'bracelet':
      return 'bracelet'
    default:
      return 'other'
  }
}

// "14K Yellow" -> karat 14K, colour Yellow; "Platinum" -> no colour. Finish is not something the ERP keeps.
function metalSpec(label: string): MetalSpec {
  const [karat, ...rest] = label.split(' ')
  const color = rest.join(' ') || null
  return {
    karatId: brand<MetalKaratId>(karat),
    karatLabel: karat,
    colorId: color ? brand<MetalColorId>(color) : null,
    colorLabel: color,
    finish: 'other',
    estimatedWeightGrams: null,
    actualWeightGrams: null,
  }
}

function stageOf(o: ErpOrder): Stage {
  switch (o.status) {
    case 'designing':
      return 'designing'
    case 'approved':
    case 'in_production':
    case 'on_hold':
      return 'production'
    case 'qc':
      return 'qc'
    case 'shipping':
      return 'shipping'
    case 'cancelled':
      return 'cancelled'
  }
}

function designingSubState(sub: ErpOrder['sub_status']): DesigningSubState {
  if (sub === 'awaiting_review') return 'awaiting_customer_review'
  if (sub === 'redesigning') return 'awaiting_modifications'
  return 'awaiting_first_cad'
}

function stageDetailOf(o: ErpOrder): StageDetail {
  switch (o.status) {
    case 'designing':
      return {
        kind: 'designing',
        subState: designingSubState(o.sub_status),
        currentCadVersion: '', // the newest design sent, filled in by fetchErpOrderPage (Step 4a)
        actionNeeded: null, // approving in the Portal arrives in Step 4b
        actionDeadline: null,
      }
    case 'qc':
      return { kind: 'qc', inspectionPassed: null, videoUrl: null }
    case 'shipping':
      return { kind: 'shipping', shippedAt: o.shipped ? day(o.shipped_on) : null, trackingNumber: null, estimatedDelivery: null }
    case 'cancelled':
      return {
        kind: 'cancelled',
        cancelledAt: day(o.cancelled_on) ?? new Date(0),
        cancelledBy: { name: 'Dia-Co', role: '', avatarInitials: 'DC', side: 'diaco' },
        reason: null,
      }
    default:
      return { kind: 'production', subStages: [] }
  }
}

function toOrder(o: ErpOrder): Order {
  const shipDate = o.shipped ? null : day(o.customer_ship_date)
  const sizeNum = o.size !== null ? Number(o.size) : NaN
  return {
    id: brand<OrderId>(o.order_no),
    poNumber: o.order_no,
    styleNumber: o.style_no,
    poEndCustomerName: o.end_customer ?? null,
    softwareOrderId: o.order_no,
    personalPo: o.ref_po,
    customerId: brand<CustomerId>(''),
    productType: productType(o.style),
    customStyle: productType(o.style) === 'other' ? o.style : null,
    size: Number.isFinite(sizeNum) ? { value: sizeNum, unit: 'US' } : null,
    quantity: o.quantity,
    finishPoint: o.finish_point ?? 'finished_piece',
    metals: o.metals.map(metalSpec),
    stones: { hasCenterStone: false, centerStone: null, accentStones: [] },
    engraving: null,
    description: '',
    customerAttachments: [],
    currentStage: stageOf(o),
    stageDetail: stageDetailOf(o),
    cadVersions: [], // Step 4a: filled from order.design by fetchErpOrderPage
    priorityRush: { eligibility: 'not_requested', fee: 0, requestedAt: null, reviewedAt: null, reviewedBy: null, denialReason: null },
    submittedAt: day(o.ordered_on) ?? new Date(0),
    lastUpdatedAt: o.updated_at ? new Date(o.updated_at) : new Date(0),
    expectedShipDate: shipDate ? { start: shipDate, end: shipDate } : null,
    shipping: { type: 'back_to_jeweler', recipientName: null, phone: null, address: null, insuredAmount: 0, carrier: null, trackingNumber: null },
    history: [],
    source: 'erp',
    portalStatus: o.status,
  }
}

// ─── The designs it was shown (Step 4a) ─────────────────────

// One showing exactly as the gateway sends it (the SQL's allowlist, render paths already turned into links).
interface ErpDesignVersion {
  v: string
  at: string | null
  renders: string[]
  model_url: string | null
  quote: {
    lines: ErpQuote['lines']
    total: number
    caution: boolean
    caution_note: string | null
    disclaimer: string | null
  } | null
}

interface ErpDesign {
  versions: CadVersion[]
  rendersUnavailable: boolean
}

// Every showing the AM sent, oldest first, as the gallery's versions: the last one is the latest.
// A showing that repeats the label of the one before it is that version sent again with an updated quote (an AM
// re-quoting at Client Review, 2026-10-22): it takes the version's place — its quote, and its stamp, which an approval
// names — while the version keeps the day it was first sent. A label that comes back later gets its position, so the
// version picker can tell them apart.
function toCadVersions(vs: ErpDesignVersion[]): CadVersion[] {
  const folded: { label: string; first: ErpDesignVersion; last: ErpDesignVersion }[] = []
  vs.forEach((v, i) => {
    const label = v.v || `v${i + 1}`
    const prev = folded[folded.length - 1]
    if (prev && prev.label === label) prev.last = v
    else folded.push({ label, first: v, last: v })
  })
  const when = (s: string | null) => {
    const d = s ? new Date(s) : null
    return d && !Number.isNaN(d.getTime()) ? d : null
  }
  const seen = new Map<string, number>()
  return folded.map(({ label, first, last: v }, i) => {
    const n = (seen.get(label) ?? 0) + 1
    seen.set(label, n)
    return {
      versionNumber: n > 1 ? `${label} (${n})` : label,
      deliveredAt: when(first.at) ?? new Date(0),
      deliveredByInternal: { name: 'Dia-Co', role: '' },
      renders: v.renders.map((url, r) => ({ imageUrl: url, label: String(r + 1), isHero: r === 0 })),
      stlFileUrl: null,
      threeDViewerUrl: v.model_url,
      notesFromDesigner: null,
      isLatest: i === folded.length - 1,
      quote: null,
      erpQuote: v.quote
        ? { lines: v.quote.lines, total: v.quote.total, caution: v.quote.caution, cautionNote: v.quote.caution_note, disclaimer: v.quote.disclaimer }
        : null,
      erpReviewAt: v.at,
      erpQuoteUpdatedAt: v !== first ? when(v.at) : null,
    }
  })
}

// ─── What the customer asked for (Step 4b) ─────────────────

// One request exactly as the gateway sends it (portal_requests_list: never who at Dia-Co decided).
interface ErpRequestRow {
  request_id: string
  kind: ErpRequest['kind']
  text: string | null
  against_v: string | null
  quote_total: number | null
  asked_by: string | null
  status: ErpRequest['status']
  created_at: string
  decided_at: string | null
  note: string | null
}

// undefined: the ERP did not answer the list (an older gateway, or a failed call) -- the page then offers no
// requests, exactly as before Step 4b.
async function fetchErpOrderRequests(orderNumber: string): Promise<ErpRequest[] | undefined> {
  const res = await callGateway<{ ok: true; requests: ErpRequestRow[] }>('requests.list', { order_no: orderNumber })
  if (!res.ok) {
    if (!EXPECTED_NO_ERP.has(res.code)) {
      console.error('[erpOrders] requests.list failed; showing the order without its requests:', { code: res.code, message: res.message })
    }
    return undefined
  }
  return (res.data.requests ?? []).map((r) => ({
    id: r.request_id,
    kind: r.kind,
    text: r.text ?? '',
    againstV: r.against_v,
    quoteTotal: typeof r.quote_total === 'number' ? r.quote_total : r.quote_total == null ? null : Number(r.quote_total),
    askedBy: r.asked_by ?? '',
    status: r.status,
    createdAt: new Date(r.created_at),
    decidedAt: r.decided_at ? new Date(r.decided_at) : null,
    note: r.note,
  }))
}

// null: no designs to show (none sent, or the ERP could not answer — the page then shows the order without them).
async function fetchErpOrderDesign(orderNumber: string): Promise<ErpDesign | null> {
  const res = await callGateway<{ ok: true; versions: ErpDesignVersion[]; renders_unavailable: boolean }>('order.design', { order_no: orderNumber })
  if (!res.ok) {
    if (!EXPECTED_NO_ERP.has(res.code) && res.code !== 'PORTAL_NOT_FOUND') {
      console.error('[erpOrders] order.design failed; showing the order without its designs:', { code: res.code, message: res.message })
    }
    return null
  }
  return { versions: toCadVersions(res.data.versions ?? []), rendersUnavailable: res.data.renders_unavailable === true }
}

export type ErpOrderPage =
  | { kind: 'found'; order: Order; customer: Customer; am: AccountManager }
  | { kind: 'not_found' }
  | null // no ERP answer for this login: use the Portal's own tables

// cache(): generateMetadata and the page ask for the same order in one request — one gateway call each.
// The order and its designs are asked for together; the designs only count once the order is found.
export const fetchErpOrderPage = cache(async (orderNumber: string): Promise<ErpOrderPage> => {
  const [res, design, requests] = await Promise.all([
    callGateway<{ ok: true; order: ErpOrder }>('order.get', { order_no: orderNumber }),
    fetchErpOrderDesign(orderNumber),
    fetchErpOrderRequests(orderNumber),
  ])
  if (!res.ok) {
    if (res.code === 'PORTAL_NOT_FOUND') return { kind: 'not_found' }
    if (!EXPECTED_NO_ERP.has(res.code)) {
      console.error('[erpOrders] order.get failed; trying the Portal\'s own order:', { code: res.code, message: res.message })
    }
    return null
  }
  const o = res.data.order
  const customer: Customer = {
    id: brand<CustomerId>(''),
    companyName: o.customer_name ?? '',
    contactName: '',
    email: '',
    phone: '',
    address: { line1: '', city: '', state: '', zip: '', country: '' },
    assignedAmId: brand<AccountManagerId>(''),
  }
  const am: AccountManager = { id: brand<AccountManagerId>(''), name: 'Dia-Co', email: '', role: 'Account Manager' }
  const order = toOrder(o)
  // Step 4a — the designs the AM sent for review, with their quotes; the newest names the version under review.
  if (design && design.versions.length) {
    order.cadVersions = design.versions
    order.erpRendersUnavailable = design.rendersUnavailable
    if (order.stageDetail.kind === 'designing') {
      order.stageDetail.currentCadVersion = design.versions[design.versions.length - 1].versionNumber
      // The ERP answers awaiting_design at Admin Review and CAD Error whether or not a version was shown. Once one
      // was, the work in hand is the next version, not the first.
      if (order.stageDetail.subState === 'awaiting_first_cad') order.stageDetail.subState = 'awaiting_modifications'
    }
  }
  // Step 4b — what the customer asked for on this order, newest first.
  order.erpRequests = requests
  // The ERP's end customer first (Dia-Co may have typed or corrected it); an order this customer sent falls back to
  // their own wording.
  const mine = (await loadSubmissionState()).converted.get(o.order_no)
  if (!order.poEndCustomerName && mine?.endCustomerName) order.poEndCustomerName = mine.endCustomerName
  return { kind: 'found', order, customer, am }
})

// ─── Is a page still current? (Step 4b) ─────────────────────

// What decides which requests an order's page offers: its status, whether a design waits for the customer's
// review, and the newest showing's stamp. Read again when a request button is pressed (checkErpOrderPage), so a
// page Dia-Co has moved past since it loaded is refreshed instead of opening a dialog the ERP would refuse.
export interface ErpReviewState {
  status: ErpPortalStatus
  awaitingReview: boolean
  latestReviewAt: string | null
}

// null: the ERP could not answer just now.
export async function fetchErpReviewState(orderNumber: string): Promise<ErpReviewState | null> {
  const [res, design] = await Promise.all([
    callGateway<{ ok: true; order: ErpOrder }>('order.get', { order_no: orderNumber }),
    callGateway<{ ok: true; versions: ErpDesignVersion[] }>('order.design', { order_no: orderNumber }),
  ])
  if (!res.ok || !design.ok) return null
  const o = res.data.order
  const versions = design.data.versions ?? []
  return {
    status: o.status,
    awaitingReview: o.status === 'designing' && o.sub_status === 'awaiting_review',
    latestReviewAt: versions.length ? versions[versions.length - 1].at ?? null : null,
  }
}
