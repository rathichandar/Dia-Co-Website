// ============================================================
// OrderHeader
// Editorial header — uniform brown uppercase breadcrumb, Playfair
// title with order number in mono + end-customer in display, inline
// status pill matching the orders list system.
// ============================================================

import Link from "next/link"
import { ArrowLeft, MessageCircle, MoreHorizontal, Share2 } from "lucide-react"
import type { Order } from "@/types/order"
import { statusPillForOrder, type StatusPill } from "@/lib/orders/statusPill"

interface OrderHeaderProps {
  order: Order
  amName: string
}

export function OrderHeader({ order, amName }: OrderHeaderProps) {
  const pill = statusPillForOrder(order)
  const amFirstName = amName.split(" ")[0]

  const submittedStr = order.submittedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  const updatedStr = order.lastUpdatedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  const actionLabel = computeActionLabel(order)

  return (
    <header className="order-head">
      <div>
        <div className="breadcrumb">
          <Link href="/orders" className="breadcrumb__item breadcrumb__back">
            <ArrowLeft size={12} /> All orders
          </Link>
          {order.personalPo && (
            <>
              <span className="breadcrumb__sep">·</span>
              <span className="breadcrumb__item">{order.personalPo}</span>
            </>
          )}
        </div>

        <h1 className="order-head__title order-head__title--detail">
          <span className="order-head__num">{order.poNumber}</span>
          {order.poEndCustomerName && (
            <span className="order-head__name">{order.poEndCustomerName}</span>
          )}
          {pill && <StatusPillBadge pill={pill} />}
        </h1>

        <div className="order-head__sub">
          Submitted {submittedStr} · Updated {updatedStr}
          {actionLabel && (
            <>
              {" · "}
              <strong
                style={{
                  color: "var(--dc-brown)",
                  fontStyle: "normal",
                  fontWeight: 600,
                }}
              >
                Action: {actionLabel}
              </strong>
            </>
          )}
        </div>
      </div>

      <div className="order-head__actions">
        <button type="button" className="btn btn--ghost">
          <Share2 size={14} /> Share
        </button>
        <button type="button" className="btn btn--ghost">
          <MessageCircle size={14} /> Message {amFirstName}
        </button>
        <button type="button" className="btn btn--ghost" aria-label="More">
          <MoreHorizontal size={14} />
        </button>
      </div>
    </header>
  )
}

function StatusPillBadge({ pill }: { pill: StatusPill }) {
  return (
    <span className={`badge badge--${pill.kind}`}>
      <span className="dot" />
      {pill.label}
    </span>
  )
}

function computeActionLabel(order: Order): string | null {
  if (order.stageDetail.kind !== "designing") return null

  switch (order.stageDetail.subState) {
    case "awaiting_first_cad":
      return null
    case "awaiting_customer_review":
      return `review CAD ${order.stageDetail.currentCadVersion} and approve`
    case "awaiting_modifications":
      return null
    case "approved":
      return null
    default:
      return null
  }
}
