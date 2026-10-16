// ============================================================
// FullSpecifications
// All details of the order in a kv-grid inside a Collapsible.
// ============================================================

import type { Order, StoneSupply } from "@/types/order"
import { Collapsible } from "./Collapsible"

interface FullSpecificationsProps {
  order: Order
}

interface Row {
  k: string
  v: React.ReactNode
  sub?: string | null
}

export function FullSpecifications({ order }: FullSpecificationsProps) {
  const rows: Row[] = []

  rows.push({ k: "Order #", v: <span className="mono">{order.poNumber}</span> })
  if (order.styleNumber)
    rows.push({
      k: "Style #",
      v: <span className="mono">{order.styleNumber}</span>,
      sub: "Re-orderable",
    })
  if (order.personalPo)
    rows.push({
      k: "Your reference",
      v: <span className="mono">{order.personalPo}</span>,
    })
  if (order.poEndCustomerName)
    rows.push({ k: "End customer", v: order.poEndCustomerName })

  rows.push({ k: "Product type", v: capitalize(order.productType) })
  rows.push({ k: "Finish point", v: finishPointLabel(order.finishPoint) })
  rows.push({
    k: "Size",
    v: order.size ? `${order.size.value} (${order.size.unit})` : "—",
  })
  rows.push({ k: "Quantity", v: String(order.quantity) })

  order.metals.forEach((m, idx) => {
    rows.push({
      k: order.metals.length > 1 ? `Metal ${idx + 1}` : "Metal",
      // "other" means the finish is not recorded (e.g. an order read from the ERP, which keeps no finish).
      v: `${m.karatLabel}${m.colorLabel ? ` ${m.colorLabel}` : ""}${m.finish !== "other" ? ` · ${m.finish.replace(/_/g, " ")}` : ""}`,
      sub: m.estimatedWeightGrams
        ? `${m.estimatedWeightGrams}g estimated${m.actualWeightGrams ? ` · ${m.actualWeightGrams}g actual` : ""}`
        : null,
    })
  })

  if (order.stones.centerStone) {
    rows.push({
      k: "Center stone",
      v: `${order.stones.centerStone.caratSize}ct ${order.stones.centerStone.shapeLabel.toLowerCase()} ${order.stones.centerStone.stoneTypeLabel.toLowerCase()}`,
      sub: [
        order.stones.centerStone.colorClarity,
        order.stones.centerStone.cert,
        supplyLabel(order.stones.centerStone.supply),
      ]
        .filter(Boolean)
        .join(" · "),
    })
  }

  order.stones.accentStones.forEach((group, idx) => {
    rows.push({
      k: order.stones.accentStones.length > 1 ? `Accents ${idx + 1}` : "Accents",
      v: `${group.quantity}× ${group.sizeMm}mm ${group.shapeLabel.toLowerCase()} ${group.stoneTypeLabel.toLowerCase()}`,
      sub: [
        `${group.cttw.toFixed(2)} cttw`,
        group.qualityLabel,
        supplyLabel(group.supply),
        group.notes,
      ]
        .filter(Boolean)
        .join(" · "),
    })
  })

  if (order.engraving) {
    rows.push({
      k: "Engraving",
      v: order.engraving.hasLogo ? "My logo" : order.engraving.text || "—",
      sub: `${order.engraving.position.replace(/_/g, " ")} · ${order.engraving.font.replace(/_/g, " ")}`,
    })
  }

  rows.push({
    k: "Submitted",
    v: order.submittedAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  })
  rows.push({
    k: "Last updated",
    v: order.lastUpdatedAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  })

  return (
    <Collapsible title="Full specifications" defaultOpen={false}>
      <div className="kv-grid">
        {rows.map((r, idx) => (
          <ReactRow key={idx} row={r} />
        ))}
      </div>
    </Collapsible>
  )
}

function ReactRow({ row }: { row: Row }) {
  return (
    <>
      <div className="k">{row.k}</div>
      <div className="v">
        {row.v}
        {row.sub && <span className="sub">{row.sub}</span>}
      </div>
    </>
  )
}

// ─── Formatters ───────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

function finishPointLabel(fp: Order["finishPoint"]): string {
  const map: Record<Order["finishPoint"], string> = {
    file: "File delivery",
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
