"use client"

// ============================================================
// ProductionPreview
// "What happens after approval" — stage-by-stage breakdown.
// Numbered list with each step's day count + footer ship-date.
// ============================================================

import type { Order } from "@/types/order"
import {
  getProductionSteps,
  computeShipDateRange,
  formatDateRange,
  formatStepDuration,
} from "@/lib/shipping"

interface ProductionPreviewProps {
  order: Order
  isRushOn: boolean
}

export function ProductionPreview({ order, isRushOn }: ProductionPreviewProps) {
  // Only the Portal's own orders show this preview, and they always have a finish point (orders.finish_point is NOT NULL).
  const finishPoint = order.finishPoint ?? "finished_piece"
  const steps = getProductionSteps(finishPoint, isRushOn)
  const shipRange = computeShipDateRange(finishPoint, isRushOn)

  return (
    <aside className="side-summary">
      <div className="side-summary__head">
        <div className="eyebrow">What happens next</div>
        <div className="tt">Production preview</div>
      </div>
      <div className="side-summary__body">
        {steps.map((step, idx) => (
          <div key={idx} className="summary-row">
            <span className="k">{idx + 1}</span>
            <span className="v">
              <strong>{step.label}</strong>
              {formatStepDuration(step)}
            </span>
          </div>
        ))}
      </div>
      <div className="side-summary__foot">
        <div className="k">If approved today, ships</div>
        <div className="v">{formatDateRange(shipRange)}</div>
        <div className="note">
          Production clock starts on approval. This estimate updates if you take
          longer to approve.
          {isRushOn && (
            <span style={{ color: "#166534", display: "block", marginTop: 4 }}>
              Priority Rush selected — subject to AM eligibility review.
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}
