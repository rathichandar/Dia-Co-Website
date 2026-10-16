// ============================================================
// YourDescription
// The order description the customer wrote at submission.
// Editorial: brown eyebrow, body paragraph, attribution line.
// ============================================================

import type { Order, Customer } from "@/types/order"

interface YourDescriptionProps {
  order: Order
  customer: Customer
}

export function YourDescription({ order, customer }: YourDescriptionProps) {
  if (!order.description) return null

  const submittedStr = order.submittedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <section className="desc-block">
      <div className="eyebrow">Your description</div>
      <p>{order.description}</p>
      <div className="attrib">
        — Submitted by {customer.contactName} on {submittedStr}
      </div>
    </section>
  )
}
