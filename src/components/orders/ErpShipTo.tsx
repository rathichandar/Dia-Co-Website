// ============================================================
// ErpShipTo (2026-10-23, the field audit)
// Where an ERP order ships, when the customer named somewhere other than
// their own address: the ERP's ship-to as it holds it now. A ship-to Dia-Co
// changed of what the customer sent says when. The Portal's own orders keep
// CustomerAndDropShip; an ERP order carries no account block, insurance or
// carrier the Portal could show.
// ============================================================

import type { ErpShipTo as ErpShipToSpec, Order } from "@/types/order"
import { changeDay, fieldChange } from "@/lib/orders/erpChanges"
import { Collapsible } from "./Collapsible"

const METHOD: Record<NonNullable<ErpShipToSpec["method"]>, string> = {
  drop_ship: "Drop-ship to your client",
  different_address: "Another address of yours",
  standard: "Your own address",
}

export function ErpShipTo({ order }: { order: Order }) {
  const s = order.erpShipTo
  if (!s) return null
  return (
    <Collapsible title={s.method === "drop_ship" ? "Drop ship" : "Ship to"} count={s.recipient} defaultOpen={false}>
      <ErpShipToGrid order={order} />
    </Collapsible>
  )
}

// The grid inside the section (its own component so it can be drawn without the section's open/closed state).
export function ErpShipToGrid({ order }: { order: Order }) {
  const s = order.erpShipTo
  if (!s) return null
  const changed = order.erpChanges?.length ? fieldChange(order.erpChanges, "shipping") : null
  const cityLine = [s.city, [s.state, s.postal].filter(Boolean).join(" ")].filter(Boolean).join(", ")

  return (
    <div className="kv-grid">
      {s.method && (
        <>
          <div className="k">Ships to</div>
          <div className="v">{METHOD[s.method]}</div>
        </>
      )}
      {s.recipient && (
        <>
          <div className="k">Recipient</div>
          <div className="v">{s.recipient}</div>
        </>
      )}
      {(s.line1 || cityLine) && (
        <>
          <div className="k">Address</div>
          <div className="v">
            {[s.line1, s.line2, cityLine, s.country].filter(Boolean).map((line, i) => (
              <span key={i} style={{ display: "block" }}>
                {line}
              </span>
            ))}
            {changed && (
              <span className="erp-ship__changed">
                <span className="erp-req__chip erp-req__chip--pending">Changed {changeDay(changed.at)}</span>
                {changed.was && (
                  <>
                    {" "}
                    You sent <s>{changed.was}</s>
                  </>
                )}
              </span>
            )}
          </div>
        </>
      )}
      {s.phone && (
        <>
          <div className="k">Phone</div>
          <div className="v">{s.phone}</div>
        </>
      )}
    </div>
  )
}
