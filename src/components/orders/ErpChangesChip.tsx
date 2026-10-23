"use client"

// ============================================================
// ErpChangesChip (2026-10-23)
// On an ERP order's card in the orders list: "3 changes by Dia-Co",
// and " · 1 new" for those made since this browser last showed the
// order's page (src/lib/orders/changesSeen.ts; the count of new ones
// appears once the browser has read it).
// ============================================================

import { changesChipText, countNew } from "@/lib/orders/erpChanges"
import { useChangesSeenBefore } from "@/lib/orders/changesSeen"

export function ErpChangesChip({ orderNo, times }: { orderNo: string; times: string[] }) {
  const seenBefore = useChangesSeenBefore(orderNo)
  return <ErpChangesChipView count={times.length} fresh={countNew(times, seenBefore)} />
}

export function ErpChangesChipView({ count, fresh }: { count: number; fresh: number }) {
  if (count <= 0) return null
  return (
    <span className="order-card__chg">
      <span className="dot" aria-hidden="true" />
      {changesChipText(count, fresh)}
    </span>
  )
}
