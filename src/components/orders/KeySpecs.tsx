// ============================================================
// KeySpecs
// Strip of at-a-glance tiles below the gallery.
// Brown uppercase eyebrow + 15px value + italic muted note.
// ============================================================

import type { Order, StoneSupply } from "@/types/order"

interface KeySpecsProps {
  order: Order
  amName: string
}

export function KeySpecs({ order, amName }: KeySpecsProps) {
  const center = order.stones.centerStone
  const accents = order.stones.accentStones
  const metal = order.metals[0]

  // Layout: top row Style / Size / Qty / AM; bottom row Finish / Metal / Center / Accents.
  const cells: Array<{ k: string; v: string; n: string | null }> = [
    { k: "Style", v: order.styleNumber || "—", n: "Re-orderable" },
    {
      k: "Size",
      v: order.size ? `${order.size.value} (${order.size.unit})` : "—",
      n: null,
    },
    { k: "Qty", v: String(order.quantity), n: null },
    { k: "AM", v: amName, n: "Dia-Co" },
    { k: "Finish", v: finishPointLabel(order.finishPoint), n: null },
    {
      k: "Metal",
      v: metal
        ? `${metal.karatLabel}${metal.colorLabel ? ` ${metal.colorLabel}` : ""}`
        : "—",
      n: metal?.estimatedWeightGrams
        ? `${metal.estimatedWeightGrams}g est.`
        : null,
    },
    {
      k: "Center",
      v: center
        ? `${center.caratSize}ct ${center.shapeLabel.toLowerCase()}`
        : "—",
      n: center ? supplyLabel(center.supply) : null,
    },
    {
      k: "Accents",
      v: accents.length > 0 ? formatAccentsPrimary(accents) : "—",
      n: accents.length > 0 ? formatAccentsSecondary(accents) : null,
    },
  ]

  return (
    <section
      className="key-specs"
      style={{ ["--key-cols" as string]: 4 }}
    >
      {cells.map((c) => (
        <div className="key-spec" key={c.k}>
          <div className="key-spec__k">{c.k}</div>
          <div className="key-spec__v">{c.v}</div>
          {c.n && <div className="key-spec__n">{c.n}</div>}
        </div>
      ))}
    </section>
  )
}

// ─── Formatters ────────────────────────────────────────────

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
