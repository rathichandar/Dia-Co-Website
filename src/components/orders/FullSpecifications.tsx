// ============================================================
// FullSpecifications
// All details of the order in a kv-grid inside a Collapsible.
//
// An ERP order (2026-10-23): its metals, center stones, accents and
// engraving in the ERP's words (`details`), and each detail Dia-Co
// changed of what the customer sent carries a "Changed {day}" chip and
// what they sent, struck through. A Portal order, or an ERP order from an
// ERP that sends neither, shows exactly what it showed before.
// ============================================================

import { sizeLabel, type ErpChangeField, type Order, type StoneSupply } from "@/types/order"
import { changeDay, fieldChange, metalLines, moreCentersText, type FieldChange } from "@/lib/orders/erpChanges"
import { Collapsible } from "./Collapsible"

interface FullSpecificationsProps {
  order: Order
}

interface Row {
  k: string
  v: React.ReactNode
  sub?: string | null
  // Dia-Co changed this detail: the chip and what the customer sent go with the value
  changed?: FieldChange | null
}

export function FullSpecifications({ order }: FullSpecificationsProps) {
  return (
    <Collapsible title="Full specifications" defaultOpen={false}>
      <FullSpecificationsGrid order={order} />
    </Collapsible>
  )
}

// The grid inside the section (its own component so it can be drawn without the section's open/closed state).
export function FullSpecificationsGrid({ order }: FullSpecificationsProps) {
  const erp = order.source === "erp"
  const details = erp ? order.erpDetails : undefined
  const changes = erp ? (order.erpChanges ?? []) : []
  const chg = (field: ErpChangeField) => (changes.length ? fieldChange(changes, field) : null)

  const rows: Row[] = []

  rows.push({ k: "Order #", v: <span className="mono">{order.poNumber}</span> })
  if (order.styleNumber)
    rows.push({
      k: "Style #",
      v: <span className="mono">{order.styleNumber}</span>,
      sub: "Re-orderable",
    })
  const refChange = chg("reference")
  if (order.personalPo || refChange)
    rows.push({
      k: "Your reference",
      v: order.personalPo ? <span className="mono">{order.personalPo}</span> : "—",
      changed: refChange,
    })
  const endChange = chg("end_customer")
  if (order.poEndCustomerName || endChange)
    rows.push({ k: "End customer", v: order.poEndCustomerName || "—", changed: endChange })

  // With the ERP's words, an order of a kind the Portal has no type for ("Charm") says so rather than "Other".
  rows.push({
    k: "Product type",
    v: details && order.productType === "other" && order.customStyle ? order.customStyle : capitalize(order.productType),
    changed: chg("product_type"),
  })
  rows.push({ k: "Finish point", v: finishPointLabel(order.finishPoint), changed: chg("finish_point") })
  rows.push({
    k: "Size",
    v: sizeLabel(order.size),
    changed: chg("size"),
  })
  rows.push({ k: "Quantity", v: String(order.quantity), changed: chg("quantity") })

  if (details) {
    // The ERP's words: one Metal row, a line per metal; the center stone with the 2nd and 3rd under it.
    const metal = metalLines(details.metals, changes)
    if (metal.lines.length || metal.loose.length)
      rows.push({
        k: "Metal",
        v: (
          <>
            {metal.lines.length === 0 && <span className="erp-chg-plain">—</span>}
            {metal.lines.map((l, i) =>
              l.change ? (
                <ChangedValue key={i} value={l.text} change={l.change} />
              ) : (
                <span key={i} className="erp-chg-plain">
                  {l.text}
                </span>
              ),
            )}
            {metal.loose.map((c, i) => (
              <span key={`loose-${i}`} className="erp-chg-line">
                <WasLine change={c} />
                <ChangedChip at={c.at} />
              </span>
            ))}
          </>
        ),
      })

    const centerChange = chg("center_stone")
    const moreChange = chg("more_centers")
    const more = moreCentersText(details.moreCenters)
    if (details.centerStone || more || centerChange || moreChange)
      rows.push({
        k: "Center stone",
        v: (
          <>
            {centerChange ? (
              <ChangedValue value={details.centerStone ?? "—"} change={centerChange} />
            ) : (
              <span className="erp-chg-plain">{details.centerStone ?? "—"}</span>
            )}
            {moreChange ? (
              <ChangedValue value={more ?? "2nd and 3rd: none"} change={moreChange} />
            ) : (
              more && <span className="erp-chg-plain">{more}</span>
            )}
          </>
        ),
      })

    const accentsChange = chg("accents")
    if (details.accents || accentsChange) rows.push({ k: "Accents", v: details.accents ?? "—", changed: accentsChange })

    const engravingChange = chg("engraving")
    if (details.engraving || engravingChange)
      rows.push({ k: "Engraving", v: details.engraving ?? "—", changed: engravingChange })
  } else {
    const metalChange = chg("metal")
    order.metals.forEach((m, idx) => {
      rows.push({
        k: order.metals.length > 1 ? `Metal ${idx + 1}` : "Metal",
        // "other" means the finish is not recorded (e.g. an order read from the ERP, which keeps no finish).
        v: `${m.karatLabel}${m.colorLabel ? ` ${m.colorLabel}` : ""}${m.finish !== "other" ? ` · ${m.finish.replace(/_/g, " ")}` : ""}`,
        sub: m.estimatedWeightGrams
          ? `${m.estimatedWeightGrams}g estimated${m.actualWeightGrams ? ` · ${m.actualWeightGrams}g actual` : ""}`
          : null,
        changed: idx === 0 ? metalChange : null,
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
    <div className="kv-grid">
      {rows.map((r, idx) => (
        <ReactRow key={idx} row={r} />
      ))}
    </div>
  )
}

function ReactRow({ row }: { row: Row }) {
  return (
    <>
      <div className="k">{row.k}</div>
      <div className="v">
        {row.changed ? <ChangedValue value={row.v} change={row.changed} /> : row.v}
        {row.sub && <span className="sub">{row.sub}</span>}
      </div>
    </>
  )
}

// A value Dia-Co changed: the value now with its chip, then what the customer sent.
function ChangedValue({ value, change }: { value: React.ReactNode; change: FieldChange }) {
  return (
    <>
      <span className="erp-chg-line">
        {value}
        <ChangedChip at={change.at} />
      </span>
      <WasLine change={change} />
    </>
  )
}

function ChangedChip({ at }: { at: string }) {
  return <span className="erp-req__chip erp-req__chip--pending">Changed {changeDay(at)}</span>
}

function WasLine({ change }: { change: FieldChange }) {
  return (
    <span className="erp-chg-was">
      {change.was !== null ? (
        <>
          You sent <s>{change.was}</s>
        </>
      ) : (
        "Added by Dia-Co"
      )}
    </span>
  )
}

// ─── Formatters ───────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

function finishPointLabel(fp: Order["finishPoint"]): string {
  if (!fp) return "—"
  const map: Record<NonNullable<Order["finishPoint"]>, string> = {
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
