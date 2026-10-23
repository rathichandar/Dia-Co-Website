// ============================================================
// Orders List page
// Route: /orders
// Server Component. Query params drive filter state:
//   ?tab=active|cancelled  (default: active)
//   ?stage=all|designing|production|late  (default: all)
// ============================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  fetchOrdersList,
  type OrdersTab,
  type StageFilter,
  type OrderListItem,
  type StatusPill,
} from '@/lib/orders/fetchOrdersList'
import { fetchDrafts, fetchDraftsCount } from '@/lib/orders/fetchDrafts'
import { loadSubmissionState } from '@/lib/erp/erpSubmissions'
import { SubmittedBanner } from '@/components/orders/SubmittedBanner'
import { DraftsTable, type DeclinedDraftItem } from '@/components/orders/DraftsTable'
import { ErpChangesChip } from '@/components/orders/ErpChangesChip'
// diaco-design.css is loaded by src/app/(authenticated)/layout.tsx

export const metadata: Metadata = {
  title: 'Orders · Dia-Co',
}

interface OrdersPageProps {
  searchParams: Promise<{
    tab?: string
    stage?: string
    // Step 6: post-submit banner sentinel. "1" → render with
    // identifier=null; any other string → render with that string as
    // the identifier. Undefined/empty → no banner. Step 7's drafts
    // view selector will add more keys here.
    submitted?: string
  }>
}

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

const PRICE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function normalizeTab(raw: string | undefined): OrdersTab {
  if (raw === 'cancelled') return 'cancelled'
  if (raw === 'drafts') return 'drafts'
  return 'active'
}
function normalizeStage(raw: string | undefined): StageFilter {
  if (raw === 'designing' || raw === 'production' || raw === 'late') return raw
  return 'all'
}

// ─── Inline Badge component (matches reference Badge API) ────

// Dark badge for the stage name (top-right of the hero image).
function StageBadge({ name }: { name: string }) {
  return <span className="badge badge--dark">{name}</span>
}

// Status pill on the top-left of the hero. Kind drives both the CSS class and the dot.
function StatusBadge({ pill }: { pill: StatusPill }) {
  return (
    <span className={`badge badge--${pill.kind}`}>
      <span className="dot" />
      {pill.label}
    </span>
  )
}

// ─── Card ────────────────────────────────────────────────────

function OrderCard({ item }: { item: OrderListItem }) {
  // ERP integration Step 3: an order sent to Dia-Co has no number (and so no page) until an AM creates it.
  if (!item.orderNumber) {
    return (
      <div className="order-card order-card--static">
        <OrderCardBody item={item} />
      </div>
    )
  }
  return (
    <Link href={`/orders/${item.orderNumber}`} className="order-card">
      <OrderCardBody item={item} />
    </Link>
  )
}

function OrderCardBody({ item }: { item: OrderListItem }) {
  const heroStyle = item.heroImageUrl
    ? { backgroundImage: `url(${item.heroImageUrl})` }
    : undefined

  return (
    <>
      <div className="order-card__img" style={heroStyle}>
        {item.statusPill ? (
          <span className="b1">
            <StatusBadge pill={item.statusPill} />
          </span>
        ) : null}
        {item.stageBadgeName ? (
          <span className="b2">
            <StageBadge name={item.stageBadgeName} />
          </span>
        ) : null}
      </div>
      <div className="order-card__body">
        <h3 className="order-card__title">
          <span className="num">{item.orderNumber || 'No. pending'}</span>
          {item.endCustomerName ?? item.productLabel ?? 'Untitled'}
        </h3>
        <div className="order-card__spec">{item.subStatusText}</div>
        {/* An ERP order Dia-Co changed of what the customer sent (2026-10-23): how many changes, and how many new. */}
        {item.orderNumber && item.erpChangeTimes?.length ? (
          <ErpChangesChip orderNo={item.orderNumber} times={item.erpChangeTimes} />
        ) : null}
        <div className="order-card__meta">
          {item.clientPo ? <span className="po">{item.clientPo}</span> : null}
          {item.submittedByName ? (
            <span>
              <span className="label">Rep</span> {item.submittedByName}
            </span>
          ) : null}
          {item.amName ? (
            <span>
              <span className="label">AM</span> {item.amName}
            </span>
          ) : null}
        </div>
        <div className="order-card__foot">
          <span className="l">
            {item.priceHidden ? '' : item.price != null ? PRICE.format(item.price) : 'Quote pending'}
          </span>
          <span className="r">
            {item.expectedShipDate
              ? `Ship ${SHORT_DATE.format(item.expectedShipDate)}`
              : 'Ship TBD'}
          </span>
        </div>
      </div>
    </>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const sp = await searchParams
  const tab = normalizeTab(sp.tab)
  const stageFilter = normalizeStage(sp.stage)
  // Submit banner sentinel projection. Tri-state:
  //   undefined / empty string → don't render banner
  //   "1"                       → render with identifier=null
  //   anything else             → render with that string as identifier
  const submittedIdentifier: string | null | undefined =
    sp.submitted === undefined || sp.submitted === ""
      ? undefined
      : sp.submitted === "1"
        ? null
        : sp.submitted

  // Active/Cancelled queries return their own items + counts. Drafts
  // is a separate fetch with its own item shape. Drafts count loads
  // alongside so the tab badge is accurate on every tab.
  const [activeCancelledResult, draftsResult, ownDraftsCount, sent] =
    await Promise.all([
      tab !== 'drafts'
        ? fetchOrdersList({ tab, stageFilter })
        : Promise.resolve({ items: [] as OrderListItem[], counts: { active: 0, cancelled: 0, all: 0, designing: 0, production: 0, late: 0 } }),
      tab === 'drafts'
        ? fetchDrafts()
        : Promise.resolve({ items: [], count: 0 }),
      fetchDraftsCount(),
      // ERP integration Step 3: orders Dia-Co declined come back to Drafts with the reason (cached: the
      // Active tab's list asks for the same state in this request).
      loadSubmissionState(),
    ])
  const { items, counts } = activeCancelledResult
  const declined: DeclinedDraftItem[] = sent.declined.map((d) => ({
    id: d.id,
    productTypeName: d.productTypeName,
    endCustomerName: d.endCustomerName,
    clientPo: d.clientPo,
    finishPoint: d.finishPoint,
    declinedAt: d.declinedAt,
    reason: d.reason,
  }))
  const draftsCount = ownDraftsCount + declined.length

  // Helper to build query-string links that preserve the other param.
  const tabHref = (t: OrdersTab) =>
    t === 'active' ? '/orders' : `/orders?tab=${t}`
  // Drafts tab: hide the toolbar entirely (search + stage filters
  // don't apply). Active keeps the full toolbar; Cancelled hides the
  // stage filters today.
  const showToolbar = tab !== 'drafts'
  const stageHref = (s: StageFilter) => {
    const params = new URLSearchParams()
    if (tab !== 'active') params.set('tab', tab)
    if (s !== 'all') params.set('stage', s)
    const qs = params.toString()
    return qs ? `/orders?${qs}` : '/orders'
  }

  return (
    <div className="diaco-design">
      <div className="page-wrap">
        {/* Page head */}
        <div className="order-head">
          <div>
            <div className="order-head__eyebrow">Workspace</div>
            <h1 className="order-head__title">Orders</h1>
            <div className="order-head__sub">
              All your custom jewelry orders, in one place.
            </div>
          </div>
          <div className="order-head__actions">
            <Link href="/orders/new" className="btn">
              + New order
            </Link>
          </div>
        </div>

        {/* Post-submit confirmation. One-shot — dismiss strips the
            ?submitted= param via router.replace() so a refresh
            doesn't re-render the banner. */}
        {submittedIdentifier !== undefined && (
          <SubmittedBanner identifier={submittedIdentifier} />
        )}

        {/* Tabs */}
        <div className="orders-tabs">
          <Link
            href={tabHref('active')}
            className={`orders-tabs__tab ${tab === 'active' ? 'is-active' : ''}`}
          >
            Active <span className="count">{counts.active}</span>
          </Link>
          <Link
            href={tabHref('drafts')}
            className={`orders-tabs__tab ${tab === 'drafts' ? 'is-active' : ''}`}
          >
            Drafts <span className="count">{draftsCount}</span>
          </Link>
          <Link
            href={tabHref('cancelled')}
            className={`orders-tabs__tab ${tab === 'cancelled' ? 'is-active' : ''}`}
          >
            Cancelled <span className="count">{counts.cancelled}</span>
          </Link>
        </div>

        {/* Toolbar — hidden on Drafts tab (search + stage filters
            don't apply to drafts per locked spec). */}
        {showToolbar && (
        <div className="orders-toolbar">
          <div className="search">
            <span aria-hidden>🔎</span>
            <input
              placeholder="Search orders by PO or rep…"
              aria-label="Search orders"
            />
          </div>
          {tab === 'active' && (
            <>
              <Link
                href={stageHref('all')}
                className={`filter ${stageFilter === 'all' ? 'is-on' : ''}`}
              >
                All stages
              </Link>
              <Link
                href={stageHref('designing')}
                className={`filter ${stageFilter === 'designing' ? 'is-on' : ''}`}
              >
                Stage A · Designing · {counts.designing}
              </Link>
              <Link
                href={stageHref('production')}
                className={`filter ${stageFilter === 'production' ? 'is-on' : ''}`}
              >
                Stage B · Production · {counts.production}
              </Link>
              <Link
                href={stageHref('late')}
                className={`filter ${stageFilter === 'late' ? 'is-on' : ''}`}
              >
                Late · {counts.late}
              </Link>
            </>
          )}
          <div className="spacer" />
        </div>
        )}

        {/* Drafts tab branch: render the dedicated table. Empty state
            is handled inside DraftsTable so the post-delete refresh
            transitions smoothly. */}
        {tab === 'drafts' && (
          <DraftsTable items={draftsResult.items} declined={declined} />
        )}

        {/* Active / Cancelled body: grid or empty state. */}
        {tab !== 'drafts' && (items.length === 0 ? (
          <div className="orders-empty">
            <h3>
              {tab === 'active'
                ? 'No active orders yet.'
                : 'No cancelled orders.'}
            </h3>
            <p>
              {tab === 'active'
                ? 'Submit a new order to get started.'
                : 'Cancellations will show up here.'}
            </p>
            {tab === 'active' ? (
              <Link href="/orders/new" className="btn">
                + New order
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="orders-grid">
            {items.map((item) => (
              <OrderCard key={item.orderId} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
