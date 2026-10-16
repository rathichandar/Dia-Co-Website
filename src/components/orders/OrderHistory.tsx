// ============================================================
// OrderHistory
// Chronological thread of events on the order.
// Avatar + named header + event chip + body. Vertical timeline.
// ============================================================

import {
  FilePlus,
  GitBranch,
  Upload,
  CheckCircle2,
  Ban,
  ArrowRight,
  Zap,
  MessageSquare,
} from "lucide-react"
import type { Order, HistoryEvent } from "@/types/order"
import { Collapsible } from "./Collapsible"

interface OrderHistoryProps {
  order: Order
}

export function OrderHistory({ order }: OrderHistoryProps) {
  if (order.history.length === 0) return null

  const count = `${order.history.length} event${order.history.length === 1 ? "" : "s"}`

  return (
    <Collapsible title="Order history" count={count} defaultOpen={true}>
      <div className="ihist__thread ihist__thread--inline">
        {order.history.map((event) => (
          <HistoryEventRow key={event.id} event={event} />
        ))}
      </div>
    </Collapsible>
  )
}

function HistoryEventRow({ event }: { event: HistoryEvent }) {
  const isCustomer = event.actor.side === "customer"
  const avClass = isCustomer ? "us" : "dc"

  return (
    <div className="ih-msg">
      <div className={`ih-msg__av ${avClass}`}>{event.actor.avatarInitials}</div>
      <div>
        <div className="ih-msg__head">
          <span className="ih-msg__name">{event.actor.name}</span>
          <span className="ih-msg__role">{event.actor.role}</span>
          <span className="ih-msg__time">{formatTimestamp(event.timestamp)}</span>
        </div>
        <div className="ih-msg__body">
          <span className="event">
            <EventIcon type={event.eventType} />
            {event.eventLabel}
          </span>
          {event.body && <p>{event.body}</p>}
          {event.attachments.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {event.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--fg-2)",
                    background: "var(--dc-gray-050)",
                    border: "1px solid var(--dc-gray-200)",
                    padding: "4px 10px",
                    textDecoration: "none",
                  }}
                >
                  {att.filename}
                </a>
              ))}
            </div>
          )}
          {event.isEdited && event.editedBy && event.editedAt && (
            <p
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "var(--fg-3)",
                fontStyle: "italic",
              }}
            >
              Edited by {event.editedBy.name} on{" "}
              {formatTimestamp(event.editedAt)}
              {event.editReason && ` — ${event.editReason}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function EventIcon({ type }: { type: HistoryEvent["eventType"] }) {
  const size = 12
  switch (type) {
    case "order_submitted":
      return <Upload size={size} />
    case "cad_delivered":
      return <FilePlus size={size} />
    case "modification_requested":
      return <GitBranch size={size} />
    case "approved":
      return <CheckCircle2 size={size} />
    case "cancelled":
      return <Ban size={size} />
    case "stage_changed":
    case "ship_date_changed":
      return <ArrowRight size={size} />
    case "priority_rush_requested":
    case "priority_rush_approved":
    case "priority_rush_denied":
      return <Zap size={size} />
    case "message":
    case "file_uploaded":
    default:
      return <MessageSquare size={size} />
  }
}

function formatTimestamp(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
