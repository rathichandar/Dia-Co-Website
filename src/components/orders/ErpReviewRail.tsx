// ============================================================
// ErpReviewRail (ERP integration Step 4a)
// The right-hand card for an order read from the ERP once a design has
// been sent: what the customer is looking at and what happens next.
// Approving or asking for changes from here arrives in Step 4b; until
// then the card sends them to their account manager. The stage and the
// ship date are the ERP's, shown elsewhere on the page.
// ============================================================

import type { CadVersion, Order } from "@/types/order"

interface ErpReviewRailProps {
  order: Order
  latestVersion: CadVersion
}

export function ErpReviewRail({ order, latestVersion }: ErpReviewRailProps) {
  const v = latestVersion.versionNumber
  const total = latestVersion.erpQuote?.total ?? null
  const card = cardFor(order, v)
  if (!card) return null

  return (
    <div className="order-page__side">
      <aside className="action-card">
        <div className={`action-card__eyebrow ${card.tone === "done" ? "erp-rail__done" : ""}`}>{card.eyebrow}</div>
        <div className="erp-rail__title">{card.title}</div>
        <p className="erp-rail__text">{card.text}</p>
        {card.showTotal && total !== null && (
          <div className="erp-rail__total">
            <span>Quote total</span>
            <strong>{money(total)}</strong>
          </div>
        )}
      </aside>
    </div>
  )
}

interface RailCard {
  eyebrow: string
  title: string
  text: string
  tone: "review" | "working" | "done"
  showTotal: boolean
}

function cardFor(order: Order, v: string): RailCard | null {
  if (order.stageDetail.kind === "designing") {
    if (order.stageDetail.subState === "awaiting_customer_review") {
      return {
        eyebrow: "Awaiting your review", title: `Design ${v} is ready`, tone: "review", showTotal: true,
        text: "Look over the renders, the 3D model and the quote. To approve this design or ask for changes, reply to your Dia-Co account manager.",
      }
    }
    const next = /^v(\d+)$/.exec(v)
    return {
      eyebrow: "Designing", title: next ? `Working on v${Number(next[1]) + 1}` : "Working on the next version", tone: "working", showTotal: false,
      text: `Dia-Co is making changes. ${v} stays here until the next version is sent.`,
    }
  }
  const where: Partial<Record<Order["currentStage"], string>> = {
    production: "in production",
    qc: "in final inspection",
    shipping: "shipping",
  }
  const stage = where[order.currentStage]
  if (!stage) return null // cancelled, or a stage this card has nothing to say about
  return {
    eyebrow: "Approved design", title: `${v}, ${stage}`, tone: "done", showTotal: true,
    text: "The renders and the quote stay here as approved. The stage and ship date follow Dia-Co.",
  }
}

function money(n: number): string {
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `−$${s}` : `$${s}`
}
