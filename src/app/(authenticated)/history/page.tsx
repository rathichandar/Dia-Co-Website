// ============================================================
// History page
// Route: /history
// Server Component. Year filter via ?year=<num|earlier>.
// ============================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  fetchHistory,
  type HistoryItem,
  type MonthGroup,
  type YearCount,
  type YearFilter,
} from '@/lib/orders/fetchHistory'
// diaco-design.css is loaded by src/app/(authenticated)/layout.tsx

export const metadata: Metadata = {
  title: 'History · Dia-Co',
}

interface HistoryPageProps {
  searchParams: Promise<{ year?: string }>
}

const PRICE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})
const SHIP_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function normalizeYear(raw: string | undefined, fallback: number): YearFilter {
  if (raw === 'earlier') return 'earlier'
  if (raw && /^\d{4}$/.test(raw)) return Number(raw)
  return fallback
}

function yearHref(value: YearFilter): string {
  const currentYear = new Date().getFullYear()
  if (value === currentYear) return '/history'
  return `/history?year=${value}`
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const sp = await searchParams
  const currentYear = new Date().getFullYear()
  const year = normalizeYear(sp.year, currentYear)

  const { monthGroups, yearCounts } = await fetchHistory({ year })

  return (
    <div className="diaco-design">
      <main className="page-wrap">
        {/* Page head */}
        <div className="order-head">
          <div>
            <div className="order-head__eyebrow">Workspace</div>
            <h1 className="order-head__title">History</h1>
            <div className="order-head__sub">
              Every shipped piece, organized by year.
            </div>
          </div>
        </div>

        {/* Toolbar with search + year filters */}
        <div className="orders-toolbar">
          <div className="search">
            <span aria-hidden>🔎</span>
            <input
              placeholder="Search history by PO or rep…"
              aria-label="Search history"
            />
          </div>
          <YearTabs yearCounts={yearCounts} active={year} />
          <div className="spacer" />
        </div>

        {/* Empty state OR month groups */}
        {monthGroups.length === 0 ? (
          <EmptyState year={year} />
        ) : (
          monthGroups.map((g) => <MonthSection key={`${g.year}-${g.month}`} group={g} />)
        )}
      </main>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────

function YearTabs({
  yearCounts,
  active,
}: {
  yearCounts: YearCount[]
  active: YearFilter
}) {
  return (
    <>
      {yearCounts.map((yc) => (
        <Link
          key={yc.value}
          href={yearHref(yc.value)}
          className={`filter ${yc.value === active ? 'is-on' : ''}`}
        >
          {yc.label} · {yc.count}
        </Link>
      ))}
    </>
  )
}

function MonthSection({ group }: { group: MonthGroup }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="sec-row">
        <div>
          <span className="sec-eyebrow">{group.monthLabel}</span>
          <h3>
            {group.count} shipped
          </h3>
        </div>
        <span className="sec-row__total">
          Total billed: {PRICE.format(group.totalBilled)}
        </span>
      </div>
      <div className="shipped-list">
        {group.items.map((item) => (
          <ShippedRow key={item.orderId} item={item} />
        ))}
      </div>
    </section>
  )
}

function ShippedRow({ item }: { item: HistoryItem }) {
  const href = `/orders/${item.orderNumber}`
  const heroStyle = item.heroImageUrl
    ? { backgroundImage: `url(${item.heroImageUrl})` }
    : undefined

  // Build the spec line (style/end-customer info)
  const orderParts: string[] = []
  if (item.styleNumber) orderParts.push(`Style: ${item.styleNumber}`)
  if (item.endCustomerName)
    orderParts.push(`End customer: ${item.endCustomerName}`)

  return (
    <Link href={href} className="shipped-row">
      <div className="img" style={heroStyle} />
      <div>
        <div className="name">{item.orderNumber}</div>
        <div className="po">{orderParts.join(' · ')}</div>
      </div>
      <div className="spec">
        {item.clientPo && <span className="mono">{item.clientPo}</span>}
        {item.clientPo && (item.repName || item.amName) && <br />}
        {(item.repName || item.amName) && (
          <span>
            {item.repName ? `Rep: ${item.repName}` : ''}
            {item.repName && item.amName ? ' · ' : ''}
            {item.amName ? `AM: ${item.amName}` : ''}
          </span>
        )}
      </div>
      <div className="when">
        Shipped<strong>{SHIP_DATE.format(item.actualShipDate)}</strong>
      </div>
      <div className="total">
        {item.totalPrice != null ? PRICE.format(item.totalPrice) : '—'}
      </div>
      <button
        type="button"
        className="reorder"
        disabled
        title="Reorder coming soon"
        onClick={(e) => e.preventDefault()}
      >
        Reorder
      </button>
    </Link>
  )
}

function EmptyState({ year }: { year: YearFilter }) {
  const label = year === 'earlier' ? 'before 2024' : year
  return (
    <div className="orders-empty">
      <h3>No orders shipped in {label}.</h3>
      <p>Completed orders will appear here once they ship.</p>
    </div>
  )
}
