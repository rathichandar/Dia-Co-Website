"use client"

// ============================================================
// OrderDetailInteractive
// Client wrapper for the two-column area.
//
// Owns shared state:
//   - isRushOn (Priority Rush toggle)
//   - activeVersionNumber (selected CAD version)
//   - lightboxIndex (which render is open in the modal viewer, null = closed)
// ============================================================

import { useState } from "react"
import type { Order, Customer, AccountManager } from "@/types/order"
import { CadHeroGallery } from "./CadHeroGallery"
import { CadLightbox } from "./CadLightbox"
import { KeySpecs } from "./KeySpecs"
import { YourDescription } from "./YourDescription"
import { ItemizedQuote } from "./ItemizedQuote"
import { OrderHistory } from "./OrderHistory"
import { RightRail } from "./RightRail"
import { ErpQuoteCard } from "./ErpQuoteCard"
import { ErpReviewRail } from "./ErpReviewRail"

interface OrderDetailInteractiveProps {
  order: Order
  customer: Customer
  am: AccountManager
}

export function OrderDetailInteractive({
  order,
  customer,
  am,
}: OrderDetailInteractiveProps) {
  // Default to latest version
  const latestVersion =
    order.cadVersions.find((v) => v.isLatest) ||
    order.cadVersions[order.cadVersions.length - 1]
  const [activeVersionNumber, setActiveVersionNumber] = useState(
    latestVersion?.versionNumber || ""
  )

  const [isRushOn, setIsRushOn] = useState(
    order.priorityRush.eligibility !== "not_requested"
  )

  // Lightbox state — null = closed; otherwise the index into activeVersion.renders
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Resolve active version object
  const activeVersion =
    order.cadVersions.find((v) => v.versionNumber === activeVersionNumber) ||
    latestVersion

  const isOnLatest = activeVersion?.versionNumber === latestVersion?.versionNumber

  // ERP integration Step 4a: an order read from the ERP shows the designs the AM sent with the ERP's
  // own quote, and a review card in place of the Portal's action rail (approving from here is Step 4b).
  const fromErp = order.source === "erp"

  // No CAD version yet (a new order, or an ERP order before its first design is sent): no gallery,
  // quote or action rail to show — but the order's own facts still are.
  if (!activeVersion) {
    return (
      <div className="order-page">
        <div className="order-page__main">
          {fromErp && order.currentStage === "designing" && (
            <div className="erp-pending">Your design is being made. It will show here when Dia-Co sends it for your review.</div>
          )}
          <KeySpecs order={order} amName={am.name} />
          <YourDescription order={order} customer={customer} />
          <OrderHistory order={order} />
        </div>
      </div>
    )
  }

  return (
    <div className="order-page">
      <div className="order-page__main">
        <CadHeroGallery
          cadVersions={order.cadVersions}
          poNumber={order.poNumber}
          activeVersionNumber={activeVersionNumber}
          onVersionChange={(v) => {
            setActiveVersionNumber(v)
            setLightboxIndex(null) // close lightbox if version changes
          }}
          onOpenLightbox={(idx) => setLightboxIndex(idx)}
          showActions={!fromErp}
          imagesUnavailable={!!order.erpRendersUnavailable}
        />
        <KeySpecs order={order} amName={am.name} />
        <YourDescription order={order} customer={customer} />
        {fromErp ? (
          <ErpQuoteCard
            activeVersion={activeVersion}
            isOnLatest={isOnLatest}
            latestVersionNumber={latestVersion?.versionNumber || ""}
          />
        ) : (
          <ItemizedQuote
            activeVersion={activeVersion}
            priorityRush={order.priorityRush}
            isRushOn={isRushOn}
            isOnLatest={isOnLatest}
            latestVersionNumber={latestVersion?.versionNumber || ""}
          />
        )}
        <OrderHistory order={order} />
      </div>

      {fromErp ? (
        latestVersion && <ErpReviewRail order={order} latestVersion={latestVersion} />
      ) : (
        <RightRail
          order={order}
          customer={customer}
          am={am}
          activeVersion={activeVersion}
          isOnLatest={isOnLatest}
          latestVersionNumber={latestVersion?.versionNumber || ""}
          isRushOn={isRushOn}
          onRushChange={setIsRushOn}
        />
      )}

      {lightboxIndex !== null && (
        <CadLightbox
          renders={activeVersion.renders}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={(next) => setLightboxIndex(next)}
        />
      )}
    </div>
  )
}
