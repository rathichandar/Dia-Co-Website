// ============================================================
// YourDescription
// The order description the customer wrote at submission.
// Editorial: brown eyebrow, body paragraph, attribution line.
// An ERP order (2026-10-23): the description and the notes for Dia-Co
// as the ERP holds them -- the customer's own words, an AM's correction
// included and marked "Changed {day}".
// ============================================================

import type { Order, Customer } from "@/types/order"
import { changeDay, fieldChange } from "@/lib/orders/erpChanges"

interface YourDescriptionProps {
  order: Order
  customer: Customer
}

export function YourDescription({ order, customer }: YourDescriptionProps) {
  const notes = order.customerNotes ?? null
  if (!order.description && !notes) return null

  const changed = order.source === "erp" && order.erpChanges?.length ? fieldChange(order.erpChanges, "description") : null
  const chip = changed && <span className="erp-req__chip erp-req__chip--pending">Changed {changeDay(changed.at)}</span>

  const submittedStr = order.submittedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <section className="desc-block">
      {order.description && (
        <>
          <div className="eyebrow">Your description{chip}</div>
          <p className="desc-block__text">{order.description}</p>
        </>
      )}
      {notes && (
        <>
          <div className={order.description ? "eyebrow desc-block__next" : "eyebrow"}>
            Your notes for Dia-Co{!order.description && chip}
          </div>
          <p className="desc-block__text">{notes}</p>
        </>
      )}
      <div className="attrib">
        — {customer.contactName ? `Submitted by ${customer.contactName} on ` : "Submitted on "}
        {submittedStr}
      </div>
    </section>
  )
}
