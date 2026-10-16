"use client"

// ============================================================
// ApproveDialog
// Order summary before commit. Uses active CAD version's quote.
// ============================================================

import { Dialog } from "./Dialog"
import type {
  Order,
  Customer,
  StoneSupply,
  CadVersion,
} from "@/types/order"
import { formatDateRange } from "@/lib/shipping"
import { computeDisplayedQuote } from "@/lib/quote"

interface ApproveDialogProps {
  open: boolean
  onClose: () => void
  order: Order
  customer: Customer
  activeVersion: CadVersion
  isRushOn: boolean
  computedShipDate: { start: Date; end: Date }
}

export function ApproveDialog({
  open,
  onClose,
  order,
  customer,
  activeVersion,
  isRushOn,
  computedShipDate,
}: ApproveDialogProps) {
  const displayedQuote = computeDisplayedQuote(
    activeVersion.quote,
    order.priorityRush,
    isRushOn
  )

  const idParts: string[] = []
  idParts.push(order.poNumber)
  if (order.poEndCustomerName) idParts[0] += ` — ${order.poEndCustomerName}`
  if (order.styleNumber) idParts.push(`Style ${order.styleNumber}`)
  const orderIdLine = idParts.join(" · ")

  function handleConfirm() {
    alert(
      `Approval placeholder — would mark ${order.poNumber} approved at CAD ${activeVersion.versionNumber} and route to production.` +
        (isRushOn
          ? `\n\nPriority Rush requested (+$${order.priorityRush.fee}) — pending AM eligibility review.`
          : "")
    )
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Approve CAD ${activeVersion.versionNumber}?`}
    >
      <p className="text-sm text-neutral-700 leading-relaxed mb-4">
        By approving, you&apos;re locking the design and committing to the order
        below.
      </p>

      <div className="bg-neutral-50 rounded p-4 space-y-2 mb-4">
        <SummaryRow
          label="Order"
          value={orderIdLine}
          sub={order.personalPo ? `Your reference: ${order.personalPo}` : null}
        />
        <SummaryRow
          label="Finish"
          value={finishPointLabel(order.finishPoint)}
        />
        <SummaryRow
          label="Metal"
          value={order.metals
            .map(
              (m) => `${m.karatLabel}${m.colorLabel ? ` ${m.colorLabel}` : ""}`
            )
            .join(" + ")}
        />
        {order.stones.centerStone && (
          <SummaryRow
            label="Center"
            value={`${order.stones.centerStone.caratSize}ct ${order.stones.centerStone.shapeLabel.toLowerCase()} ${order.stones.centerStone.stoneTypeLabel.toLowerCase()}`}
            sub={supplyLabel(order.stones.centerStone.supply)}
          />
        )}
        {order.stones.accentStones.length > 0 && (
          <SummaryRow
            label="Accents"
            value={order.stones.accentStones
              .map(
                (a) =>
                  `${a.cttw.toFixed(2)} cttw ${a.stoneTypeLabel.toLowerCase()}`
              )
              .join(" + ")}
            sub={
              new Set(order.stones.accentStones.map((a) => a.supply)).size === 1
                ? supplyLabel(order.stones.accentStones[0].supply)
                : "Mixed supply"
            }
          />
        )}
        <SummaryRow
          label="Size · Qty"
          value={`${order.size ? `${order.size.value} (${order.size.unit})` : "—"} · ${order.quantity}`}
        />
        <SummaryRow
          label="Estimated total"
          value={`$${displayedQuote.estimatedTotal.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          sub={
            isRushOn
              ? `Includes $${order.priorityRush.fee} Priority Rush · ±5% on actual materials`
              : "±5% on actual materials"
          }
        />
        <SummaryRow
          label="Expected ship"
          value={formatDateRange(computedShipDate)}
          sub={
            isRushOn
              ? "Priority Rush — pending AM review"
              : "Production starts on approval"
          }
        />
        <SummaryRow
          label="Drop ship to"
          value={
            order.shipping.recipientName
              ? `${order.shipping.recipientName}, ${order.shipping.address?.city}, ${order.shipping.address?.state}`
              : customer.companyName
          }
        />
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed mb-5">
        You won&apos;t be able to request further changes after approval. If you
        need to adjust anything, request a modification instead.
      </p>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded"
        >
          Yes, approve
        </button>
      </div>
    </Dialog>
  )
}

function SummaryRow({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string | null
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <div className="text-xs uppercase tracking-wider text-neutral-500 pt-0.5">
        {label}
      </div>
      <div>
        <div className="text-neutral-900">{value}</div>
        {sub && <div className="text-xs text-neutral-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function finishPointLabel(fp: Order["finishPoint"]): string {
  const map: Record<Order["finishPoint"], string> = {
    file: "File",
    wax: "Wax",
    raw_casting: "Raw casting",
    polished_mounting: "Polished mounting",
    finished_piece: "Finished piece",
  }
  return map[fp]
}

function supplyLabel(supply: StoneSupply): string {
  const map: Record<StoneSupply, string> = {
    provided_by_customer: "Provided by you",
    provided_by_diaco: "Provided by Dia-Co",
    tbd: "TBD — to confirm",
    not_in_design: "N/A",
  }
  return map[supply]
}
