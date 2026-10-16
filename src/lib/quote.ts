// ============================================================
// Quote computation helpers
//
// The "displayed" quote is a function of:
//   - the base quote stored on the order
//   - the current Priority Rush toggle state
//
// In Phase 3, this helper will grow to handle dynamic metal/stone
// changes too. For Phase 1, it just adds a Priority Rush line.
// ============================================================

import type { Quote, QuoteLineItem, PriorityRush } from "@/types/order"

export function computeDisplayedQuote(
  baseQuote: Quote,
  priorityRush: PriorityRush,
  isRushOn: boolean
): Quote {
  // If rush is off, return the base quote unchanged
  if (!isRushOn) return baseQuote

  // Insert the Priority Rush line right above the Drop shipping line
  // (or at the end if no shipping line exists)
  const shippingIdx = baseQuote.lineItems.findIndex(
    (li) => li.category === "shipping"
  )

  const rushLine: QuoteLineItem = {
    category: "other",
    label: "Priority Rush",
    subLabel: "Subject to AM eligibility review",
    qty: 1,
    qtyUnit: "",
    unitPrice: priorityRush.fee,
    total: priorityRush.fee,
    flag: null,
    indent: 0,
    isGroupHeader: false,
  }

  const newLineItems =
    shippingIdx >= 0
      ? [
          ...baseQuote.lineItems.slice(0, shippingIdx),
          rushLine,
          ...baseQuote.lineItems.slice(shippingIdx),
        ]
      : [...baseQuote.lineItems, rushLine]

  return {
    ...baseQuote,
    lineItems: newLineItems,
    estimatedTotal: baseQuote.estimatedTotal + priorityRush.fee,
    subtotal: baseQuote.subtotal + priorityRush.fee,
  }
}
