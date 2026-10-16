"use client"

// ============================================================
// RightRail
// Sticky right column: ActionCard + ProductionPreview.
// ============================================================

import type {
  Order,
  Customer,
  AccountManager,
  CadVersion,
} from "@/types/order"
import { ActionCard } from "./ActionCard"
import { ProductionPreview } from "./ProductionPreview"

interface RightRailProps {
  order: Order
  customer: Customer
  am: AccountManager
  activeVersion: CadVersion
  isOnLatest: boolean
  latestVersionNumber: string
  isRushOn: boolean
  onRushChange: (next: boolean) => void
}

export function RightRail({
  order,
  customer,
  am,
  activeVersion,
  isOnLatest,
  latestVersionNumber,
  isRushOn,
  onRushChange,
}: RightRailProps) {
  return (
    <div className="order-page__side">
      <ActionCard
        order={order}
        customer={customer}
        am={am}
        activeVersion={activeVersion}
        isOnLatest={isOnLatest}
        latestVersionNumber={latestVersionNumber}
        isRushOn={isRushOn}
        onRushChange={onRushChange}
      />
      <ProductionPreview order={order} isRushOn={isRushOn} />
    </div>
  )
}
