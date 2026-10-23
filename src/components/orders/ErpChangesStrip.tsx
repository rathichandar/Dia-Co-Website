// ============================================================
// ErpChangesStrip (2026-10-23)
// Under an ERP order's header: Dia-Co changed some of what the
// customer sent, which details, and a link to the "Changed by Dia-Co"
// card in the right rail (id="changes").
// ============================================================

import type { ErpChange } from "@/types/order"
import { changesStripText } from "@/lib/orders/erpChanges"

export function ErpChangesStrip({ changes }: { changes: ErpChange[] }) {
  if (!changes.length) return null
  const { lead, rest } = changesStripText(changes)
  return (
    <p className="erp-chg-strip">
      <span className="dot" aria-hidden="true" />
      <span>
        <b>{lead}</b>
        {rest}
      </span>
      <a href="#changes">See the changes</a>
    </p>
  )
}
