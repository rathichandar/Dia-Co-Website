// ============================================================
// KeySpecs
// Strip of at-a-glance tiles below the gallery.
// Brown uppercase eyebrow + 15px value + italic muted note.
// An ERP order (2026-10-23): its center stone and accents in the ERP's
// words, and a tile whose detail Dia-Co changed of what the customer sent
// is marked (a gold top edge) and says what they sent.
// ============================================================

import { sizeLabel, type ErpChangeField, type Order, type StoneSupply } from "@/types/order"
import { fieldChange, metalLines, tileParts, type FieldChange } from "@/lib/orders/erpChanges"

interface KeySpecsProps {
  order: Order
  amName: string
}

export function KeySpecs({ order, amName }: KeySpecsProps) {
  const center = order.stones.centerStone
  const accents = order.stones.accentStones
  const metal = order.metals[0]
  const erp = order.source === "erp"
  const details = erp ? order.erpDetails : undefined
  const changes = erp ? (order.erpChanges ?? []) : []
  const centerWords = details ? tileParts(details.centerStone) : null
  const accentWords = details ? tileParts(details.accents) : null

  // What the customer sent, when Dia-Co changed the tile's detail. The Metal tile shows the first metal: what was
  // sent for that one when it changed, else for whichever changed.
  function changeOf(field: ErpChangeField): FieldChange | null {
    if (!changes.length) return null
    if (field === "metal" && details) return metalLines(details.metals, changes).lines[0]?.change ?? fieldChange(changes, "metal")
    return fieldChange(changes, field)
  }

  // Layout: top row Style / Size / Qty / AM; bottom row Finish / Metal / Center / Accents.
  const cells: Array<{ k: string; v: string; n: string | null; field?: ErpChangeField }> = [
    { k: "Style", v: order.styleNumber || "—", n: "Re-orderable" },
    {
      k: "Size",
      v: sizeLabel(order.size),
      n: null,
      field: "size",
    },
    { k: "Qty", v: String(order.quantity), n: null, field: "quantity" },
    { k: "AM", v: amName, n: "Dia-Co" },
    { k: "Finish", v: finishPointLabel(order.finishPoint), n: null, field: "finish_point" },
    {
      k: "Metal",
      // An ERP order names every metal ("18K White + 14K Yellow"); a Portal order's tile keeps its first.
      v: metal
        ? (erp ? order.metals : [metal]).map((m) => `${m.karatLabel}${m.colorLabel ? ` ${m.colorLabel}` : ""}`).join(" + ")
        : "—",
      n: metal?.estimatedWeightGrams
        ? `${metal.estimatedWeightGrams}g est.`
        : null,
      field: "metal",
    },
    centerWords
      ? { k: "Center", ...centerWords, field: "center_stone" }
      : {
          k: "Center",
          v: center
            ? `${center.caratSize}ct ${center.shapeLabel.toLowerCase()}`
            : "—",
          n: center ? supplyLabel(center.supply) : null,
          field: "center_stone",
        },
    accentWords
      ? { k: "Accents", ...accentWords, field: "accents" }
      : {
          k: "Accents",
          v: accents.length > 0 ? formatAccentsPrimary(accents) : "—",
          n: accents.length > 0 ? formatAccentsSecondary(accents) : null,
          field: "accents",
        },
  ]

  return (
    <section
      className="key-specs"
      style={{ ["--key-cols" as string]: 4 }}
    >
      {cells.map((c) => {
        const changed = c.field ? changeOf(c.field) : null
        return (
          <div className={changed ? "key-spec is-changed" : "key-spec"} key={c.k}>
            <div className="key-spec__k">{c.k}</div>
            <div className="key-spec__v">{c.v}</div>
            {changed ? (
              <div className="key-spec__n">
                {changed.was !== null ? (
                  <>
                    Changed · you sent <s>{changed.was}</s>
                  </>
                ) : (
                  "Changed · added by Dia-Co"
                )}
              </div>
            ) : (
              c.n && <div className="key-spec__n">{c.n}</div>
            )}
          </div>
        )
      })}
    </section>
  )
}

// ─── Formatters ────────────────────────────────────────────

function finishPointLabel(fp: Order["finishPoint"]): string {
  if (!fp) return "—"
  const map: Record<NonNullable<Order["finishPoint"]>, string> = {
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

function formatAccentsPrimary(
  accents: { cttw: number; stoneTypeLabel: string }[]
): string {
  return accents
    .map((a) => `${a.cttw.toFixed(2)} cttw ${a.stoneTypeLabel.toLowerCase()}`)
    .join(" + ")
}

function formatAccentsSecondary(
  accents: { supply: StoneSupply }[]
): string {
  const supplies = new Set(accents.map((a) => a.supply))
  if (supplies.size === 1) return supplyLabel(accents[0].supply)
  return "Mixed supply"
}
