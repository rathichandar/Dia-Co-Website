"use client"

// ============================================================
// DraftsTable — Step 7 Drafts list UI.
//
// Renders a table of the customer's drafts with:
//   - Row checkbox on the far left + header "select all"
//   - Click anywhere on the four content columns → resume the draft
//     at /orders/new?orderId={uuid}
//   - "Delete drafts (N)" button above the table, disabled at 0,
//     enabled with live count when 1+ selected
//   - Click → inline confirm strip replaces the button:
//       "Delete N drafts? · Confirm · Cancel"
//   - Confirm fires the bulk hard-delete server action, then
//     router.refresh() to re-query (accurate state, ~50ms latency)
//
// When the items array is empty (either no drafts or all just
// deleted), renders the empty state instead.
//
// ERP integration Step 3: orders Dia-Co DECLINED come first, each with
// the reason and an "Edit and send again" button (a POST — the server
// action asks the ERP before it reopens anything). They are not drafts
// yet, so they cannot be selected or deleted here.
// ============================================================

import { Fragment, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { discardDrafts } from "@/lib/orders/discardDrafts"
import { reopenDeclinedOrderAction } from "@/lib/orders/reopenDeclinedOrder"
import { relativeTimeLong } from "@/lib/relativeTime"
import type { DraftListItem } from "@/lib/orders/fetchDrafts"

export interface DeclinedDraftItem {
  id: string
  productTypeName: string | null
  endCustomerName: string | null
  clientPo: string | null
  finishPoint: string | null
  declinedAt: Date | null
  reason: string
}

type RowLike = Pick<DraftListItem, "productTypeName" | "endCustomerName" | "clientPo" | "finishPoint">

const LONG_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

// Display-cased product names. Master rows are title-cased already
// ("Ring", "Pendant", etc.), so we pass through. Fallback "—" when
// no product type picked yet.
function productLabel(item: RowLike): string {
  return item.productTypeName ?? "—"
}

// Customer reference column: end customer name OR PO, whichever's
// filled. No parenthetical label per spec — plain value, em-dash
// when neither filled.
function customerReference(item: RowLike): string {
  const name = item.endCustomerName?.trim()
  if (name) return name
  const po = item.clientPo?.trim()
  if (po) return po
  return "—"
}

// Finish-point enum → display label. Em-dash when unset.
const FINISH_POINT_LABELS: Record<string, string> = {
  file: "File",
  wax: "Wax",
  raw_casting: "Raw casting",
  polished_mounting: "Polished mounting",
  finished_piece: "Finished piece",
}
function finishLabel(item: RowLike): string {
  if (!item.finishPoint) return "—"
  return FINISH_POINT_LABELS[item.finishPoint] ?? item.finishPoint
}

export function DraftsTable({
  items,
  declined = [],
}: {
  items: DraftListItem[]
  declined?: DeclinedDraftItem[]
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (items.length === 0 && declined.length === 0) {
    return (
      <div className="orders-empty">
        <h3>No drafts yet.</h3>
        <p>Start a new order to create one.</p>
        <a href="/orders/new" className="btn">
          + New order
        </a>
      </div>
    )
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length
  const someSelected = selectedIds.size > 0 && !allSelected
  const selectedCount = selectedIds.size

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) return new Set()
      return new Set(items.map((i) => i.id))
    })
  }

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await discardDrafts({
        orderIds: Array.from(selectedIds),
      })
      if (!result.ok) {
        setError(result.error ?? "Delete failed. Please try again.")
        return
      }
      // Clear selection + confirm state, then re-query the server.
      // router.refresh() re-runs the page's RSC fetches; the list
      // disappears the now-deleted rows on the next render.
      setSelectedIds(new Set())
      setConfirming(false)
      router.refresh()
    })
  }

  return (
    <div className="drafts-wrap">
      {/* Action bar — either the Delete button or the inline confirm
         strip. State flips between them; layout stays stable. Hidden when
         the only rows are declined orders (those are not deletable here). */}
      {items.length > 0 && (
      <div className="drafts-actions">
        {confirming ? (
          <div className="drafts-confirm" role="alert">
            <span>Delete {selectedCount} draft{selectedCount === 1 ? "" : "s"}?</span>
            <button
              type="button"
              className="btn btn--sm"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Confirm"}
            </button>
            <button
              type="button"
              className="btn btn--sec btn--sm"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            {error && <span className="drafts-error">{error}</span>}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--sec"
            disabled={selectedCount === 0}
            onClick={() => setConfirming(true)}
          >
            {selectedCount > 0
              ? `Delete drafts (${selectedCount})`
              : "Delete drafts"}
          </button>
        )}
      </div>
      )}

      <table className="drafts-table">
        <thead>
          <tr>
            <th className="drafts-table__check">
              {items.length > 0 && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  aria-label="Select all drafts"
                />
              )}
            </th>
            <th>Product</th>
            <th>Customer reference</th>
            <th>Finish</th>
            <th className="drafts-table__right">Last edited</th>
          </tr>
        </thead>
        <tbody>
          {declined.map((d) => (
            <Fragment key={d.id}>
              <tr className="drafts-table__row drafts-table__row--declined">
                <td className="drafts-table__check" />
                <td>
                  {productLabel(d)}{" "}
                  <span className="badge badge--late drafts-declined__badge">
                    <span className="dot" />
                    Declined
                  </span>
                </td>
                <td>{customerReference(d)}</td>
                <td>{finishLabel(d)}</td>
                <td className="drafts-table__right">
                  {d.declinedAt ? relativeTimeLong(d.declinedAt) : "—"}
                </td>
              </tr>
              <tr className="drafts-table__reason-row">
                <td className="drafts-table__check" />
                <td colSpan={4}>
                  <div className="drafts-declined">
                    <div className="drafts-declined__head">
                      Dia-Co declined this{d.declinedAt ? ` on ${LONG_DATE.format(d.declinedAt)}` : ""}:
                    </div>
                    <div className="drafts-declined__reason">“{d.reason}”</div>
                    <form action={reopenDeclinedOrderAction}>
                      <input type="hidden" name="orderId" value={d.id} />
                      <button type="submit" className="btn btn--sm">
                        Edit and send again
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            </Fragment>
          ))}
          {items.map((item) => {
            const checked = selectedIds.has(item.id)
            const resumeHref = `/orders/new?orderId=${encodeURIComponent(item.id)}`
            const navigate = () => router.push(resumeHref)
            return (
              <tr key={item.id} className="drafts-table__row">
                <td
                  className="drafts-table__check"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(item.id)}
                    aria-label={`Select draft ${customerReference(item)}`}
                  />
                </td>
                <td onClick={navigate} className="drafts-table__cell">
                  {productLabel(item)}
                </td>
                <td onClick={navigate} className="drafts-table__cell">
                  {customerReference(item)}
                </td>
                <td onClick={navigate} className="drafts-table__cell">
                  {finishLabel(item)}
                </td>
                <td
                  onClick={navigate}
                  className="drafts-table__cell drafts-table__right"
                >
                  {relativeTimeLong(item.updatedAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
