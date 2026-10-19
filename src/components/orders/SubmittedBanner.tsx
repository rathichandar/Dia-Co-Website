"use client"

// ============================================================
// SubmittedBanner
//
// Post-submit confirmation banner on /orders. Rendered conditionally
// by the /orders page when searchParams.submitted is present.
//
// Props:
//   identifier: string | null
//     - null when the submitted order has no order_number yet
//       (portal-only submits don't trigger software sync, so the
//       identifier won't be populated until that integration ships).
//       Banner reads "Order submitted for free quote" with no ID.
//     - string when populated (e.g., "DG-10047"). Banner reads
//       "Order DG-10047 submitted for free quote".
//
// Dismiss model:
//   - Local `dismissed` state unmounts the banner.
//   - URL cleanup: router.replace() drops the `submitted` query param
//     while preserving other params (tab, stage, future Step 7 view).
//     Uses replace() not push() so the back button doesn't restore
//     the submitted state.
//   - No auto-dismiss timer per locked spec.
// ============================================================

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, X } from "lucide-react"

export function SubmittedBanner({
  identifier,
}: {
  identifier: string | null
}) {
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  if (dismissed) return null

  // ERP integration Step 3: "sent" = the order went to Dia-Co, where an AM checks it; it gets its number
  // when they create it.
  const sentToDiaco = identifier === "sent"
  const headline = sentToDiaco
    ? "Sent to Dia-Co"
    : identifier
      ? `Order ${identifier} submitted for free quote`
      : "Order submitted for free quote"
  const sub = sentToDiaco
    ? "Your account manager will check it and confirm. The order number appears here once it's created."
    : "Your AM will send a quote within 18-48 hours."

  const handleDismiss = () => {
    setDismissed(true)
    // Strip the `submitted` param but preserve everything else
    // (tab, stage, etc.). router.replace() so the back button
    // doesn't restore the submitted= URL — the confirmation is a
    // one-time event, not a history checkpoint.
    const params = new URLSearchParams(searchParams.toString())
    params.delete("submitted")
    const qs = params.toString()
    router.replace(qs ? `/orders?${qs}` : "/orders")
  }

  return (
    <div className="submit-banner" role="status">
      <span className="submit-banner__ico" aria-hidden>
        <CheckCircle size={20} />
      </span>
      <div className="submit-banner__body">
        <strong>{headline}</strong>
        <span className="submit-banner__sub">{sub}</span>
      </div>
      <button
        type="button"
        className="submit-banner__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  )
}
