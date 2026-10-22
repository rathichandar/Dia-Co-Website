"use client"

// ============================================================
// ErpReviewRail (ERP integration Steps 4a and 4b)
// The right-hand cards for an order read from the ERP:
//   - the review card: what the customer is looking at and what happens
//     next. At Client Review it carries Approve and Request changes
//     (Step 4b); once one is sent, it says Dia-Co has it.
//   - Other requests: Priority Rush until production starts, and cancel
//     while the order is designing.
//   - Your requests: what Dia-Co did with the ones it answered, in its
//     own words.
// A request changes nothing on the order by itself: the ERP files it for
// an AM, who acts on it (contract §9). The actions show only when the ERP
// answered the requests list, so a gateway without Step 4b leaves this rail
// as Step 4a drew it. The stage and the ship date are the ERP's, shown
// elsewhere on the page.
// The page keeps up with the ERP two ways: it reads the order again when
// the customer comes back to the tab, and a request button checks the page
// against the ERP before its dialog opens.
// ============================================================

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { CadVersion, ErpRequest, ErpRequestKind, Order } from "@/types/order"
import { checkErpOrderPage } from "@/lib/orders/checkErpOrderPage"
import { ErpRequestDialog } from "./dialogs/ErpRequestDialog"

interface ErpReviewRailProps {
  order: Order
  // null: no design has been sent yet (only the other requests can be shown)
  latestVersion: CadVersion | null
}

export function ErpReviewRail({ order, latestVersion }: ErpReviewRailProps) {
  const router = useRouter()
  const [asking, setAsking] = useState<ErpRequestKind | null>(null)
  // The request whose button is checking the page against the ERP, and whether a check found the page behind.
  const [checking, setChecking] = useState<ErpRequestKind | null>(null)
  const [behind, setBehind] = useState(false)
  useRefreshOnReturn(asking !== null || checking !== null)
  const requests = order.erpRequests
  const canAsk = requests !== undefined
  const open = openByKind(requests ?? [])
  const answered = (requests ?? []).filter((r) => r.status !== "pending")

  const card = latestVersion ? cardFor(order, latestVersion, open, canAsk) : null
  const status = order.portalStatus
  // Granted once, Priority Rush is not offered again (the page cannot see the roadmap; the ERP would refuse a second ask).
  const rushGranted = (requests ?? []).some((r) => r.kind === "rush" && r.status === "done")
  const rush: RowState = open.rush ? "pending" : !rushGranted && (status === "designing" || status === "approved") ? "ask" : "none"
  const cancel: RowState = open.cancel
    ? "pending"
    : status === "designing"
      ? "ask"
      : status === "in_production" || status === "qc" || status === "on_hold"
        ? "closed"
        : "none"
  const showOther = canAsk && (rush !== "none" || cancel !== "none")

  // Before a dialog opens, the page is checked against the ERP. If Dia-Co moved the order since the page loaded,
  // the page refreshes and says so instead. If the ERP can't answer, the dialog opens: the ERP checks on send.
  async function ask(kind: ErpRequestKind) {
    setChecking(kind)
    setBehind(false)
    const r = await checkErpOrderPage({
      orderNumber: order.softwareOrderId ?? "",
      status: order.portalStatus ?? null,
      awaitingReview: order.stageDetail.kind === "designing" && order.stageDetail.subState === "awaiting_customer_review",
      reviewAt: latestVersion?.erpReviewAt ?? null,
    }).catch(() => null)
    setChecking(null)
    if (r?.behind) {
      setBehind(true)
      router.refresh()
      return
    }
    setAsking(kind)
  }

  if (!card && !showOther && !answered.length && !behind) return null
  const cards = (behind ? 1 : 0) + (card ? 1 : 0) + (showOther ? 1 : 0) + (answered.length ? 1 : 0)

  return (
    <div className={cards > 1 ? "order-page__side erp-req__side" : "order-page__side"}>
      {behind && (
        <aside className="erp-req erp-req--behind" role="status">
          <div className="erp-req__eyebrow">Page updated</div>
          <p className="erp-req__text">This order changed after you opened the page. It now shows where things stand. Look it over before you ask again.</p>
        </aside>
      )}

      {card && (
        <aside className="action-card">
          <div className={`action-card__eyebrow ${card.tone === "done" ? "erp-rail__done" : ""}`}>{card.eyebrow}</div>
          <div className="erp-rail__title">{card.title}</div>
          <p className="erp-rail__text">{card.text}</p>
          {card.quoted && <div className="erp-req__said">{card.quoted}</div>}
          {card.total && (
            <div className="erp-rail__total">
              <span>{card.total.label}</span>
              <strong>{card.total.value}</strong>
            </div>
          )}
          {card.actions && (
            <div className="action-card__actions">
              <button type="button" className="btn" disabled={checking !== null} onClick={() => ask("approve")}>
                {checking === "approve" ? "Checking…" : <>Approve design {latestVersion?.versionNumber}</>}
              </button>
              <button type="button" className="btn btn--sec" disabled={checking !== null} onClick={() => ask("modify")}>
                {checking === "modify" ? "Checking…" : "Request changes"}
              </button>
            </div>
          )}
        </aside>
      )}

      {showOther && (
        <aside className="erp-req" aria-label="Other requests">
          <div className="erp-req__eyebrow">Other requests</div>
          {rush !== "none" && (
            <div className="erp-req__row">
              <div className="erp-req__head">
                <span className="erp-req__name">Priority Rush</span>
                {rush === "pending" && <span className="erp-req__chip erp-req__chip--pending">Pending</span>}
              </div>
              {rush === "pending" && open.rush ? (
                <p className="erp-req__text">You asked on {day(open.rush.createdAt)}. Your account manager confirms within 1 business day.</p>
              ) : (
                <>
                  <p className="erp-req__text">Ask for this order to go to the front of production. Your account manager confirms within 1 business day.</p>
                  <button type="button" className="btn btn--sec btn--sm erp-req__ask" disabled={checking !== null} onClick={() => ask("rush")}>
                    {checking === "rush" ? "Checking…" : "Ask for Priority Rush"}
                  </button>
                </>
              )}
            </div>
          )}
          {cancel !== "none" && (
            <div className="erp-req__row">
              <div className="erp-req__head">
                <span className="erp-req__name">Cancel the order</span>
                {cancel === "pending" && <span className="erp-req__chip erp-req__chip--pending">Pending</span>}
              </div>
              {cancel === "pending" && open.cancel ? (
                <p className="erp-req__text">You asked on {day(open.cancel.createdAt)}. Your account manager confirms a cancellation; until then the order carries on.</p>
              ) : cancel === "closed" ? (
                <p className="erp-req__text">Production has started. To ask about cancelling now, contact your account manager.</p>
              ) : (
                <>
                  <p className="erp-req__text">Your account manager confirms a cancellation. Until then the order carries on.</p>
                  <button type="button" className="btn btn--danger btn--sm erp-req__ask" disabled={checking !== null} onClick={() => ask("cancel")}>
                    {checking === "cancel" ? "Checking…" : "Ask to cancel"}
                  </button>
                </>
              )}
            </div>
          )}
          <p className="erp-req__foot">Requests go to your account manager. Nothing on the order changes until Dia-Co acts on them.</p>
        </aside>
      )}

      {answered.length > 0 && (
        <aside className="erp-req" aria-label="Your requests">
          <div className="erp-req__eyebrow">Your requests</div>
          {answered.map((r) => (
            <div key={r.id} className="erp-req__row">
              <div className="erp-req__head">
                <span className="erp-req__name">{requestName(r)}</span>
                <span className={`erp-req__chip erp-req__chip--${r.status}`}>{r.status === "done" ? "Done" : "Declined"}</span>
              </div>
              <p className="erp-req__meta">
                You asked on {day(r.createdAt)}
                {r.decidedAt ? ` · Dia-Co replied on ${day(r.decidedAt)}` : ""}
              </p>
              {r.note && <div className="erp-req__said">Dia-Co: {r.note}</div>}
            </div>
          ))}
        </aside>
      )}

      <ErpRequestDialog kind={asking} onClose={() => setAsking(null)} order={order} latestVersion={latestVersion} />
    </div>
  )
}

// A page left open in another tab or window reads the order again when the customer comes back to it -- at most
// every 30 seconds, and not while a request is being checked or its dialog is open -- so it doesn't keep offering
// what Dia-Co has already moved past.
const REFRESH_AFTER_MS = 30_000

function useRefreshOnReturn(paused: boolean) {
  const router = useRouter()
  const last = useRef(0)
  useEffect(() => {
    if (paused) return
    last.current = Date.now()
    function back() {
      if (document.visibilityState !== "visible" || Date.now() - last.current < REFRESH_AFTER_MS) return
      last.current = Date.now()
      router.refresh()
    }
    document.addEventListener("visibilitychange", back)
    window.addEventListener("focus", back)
    return () => {
      document.removeEventListener("visibilitychange", back)
      window.removeEventListener("focus", back)
    }
  }, [paused, router])
}

type RowState = "ask" | "pending" | "closed" | "none"
type OpenRequests = Partial<Record<ErpRequestKind, ErpRequest>>

interface RailCard {
  eyebrow: string
  title: string
  text: string
  tone: "review" | "working" | "done"
  quoted?: string
  total?: { label: string; value: string }
  actions?: boolean
}

function openByKind(requests: ErpRequest[]): OpenRequests {
  const open: OpenRequests = {}
  for (const r of requests) if (r.status === "pending" && !open[r.kind]) open[r.kind] = r
  return open
}

function cardFor(order: Order, latest: CadVersion, open: OpenRequests, canAsk: boolean): RailCard | null {
  const v = latest.versionNumber
  const total = latest.erpQuote?.total ?? null
  if (order.stageDetail.kind === "designing") {
    if (order.stageDetail.subState === "awaiting_customer_review") {
      if (open.approve) {
        const t = open.approve.quoteTotal
        return {
          eyebrow: "Approval sent", title: "Waiting for Dia-Co", tone: "review",
          text: `You approved ${open.approve.againstV ?? v} and its quote on ${dayTime(open.approve.createdAt)}. Your account manager records it and schedules production.`,
          total: { label: t !== null ? "Quote accepted" : "Quote", value: t !== null ? money(t) : "None was sent" },
        }
      }
      if (open.modify) {
        const asked = open.modify.againstV ?? v
        return {
          eyebrow: "Changes requested", title: "Waiting for Dia-Co", tone: "review",
          text: `You asked for changes to ${asked} on ${day(open.modify.createdAt)}. ${asked} stays here until the next version is sent.`,
          quoted: open.modify.text,
        }
      }
      return {
        eyebrow: "Awaiting your review", title: `Design ${v} is ready`, tone: "review",
        text: canAsk
          ? "Look over the renders, the 3D model and the quote. Approving the design also accepts this quote."
          : "Look over the renders, the 3D model and the quote. To approve this design or ask for changes, reply to your Dia-Co account manager.",
        total: total !== null ? { label: "Quote total", value: money(total) } : undefined,
        actions: canAsk,
      }
    }
    const next = /^v(\d+)$/.exec(v)
    return {
      eyebrow: "Designing", title: next ? `Working on v${Number(next[1]) + 1}` : "Working on the next version", tone: "working",
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
    eyebrow: "Approved design", title: `${v}, ${stage}`, tone: "done",
    text: "The renders and the quote stay here as approved. The stage and ship date follow Dia-Co.",
    total: total !== null ? { label: "Quote total", value: money(total) } : undefined,
  }
}

function requestName(r: ErpRequest): string {
  if (r.kind === "approve") return `Approval of ${r.againstV ?? "the design"}`
  if (r.kind === "modify") return `Changes to ${r.againstV ?? "the design"}`
  if (r.kind === "rush") return "Priority Rush"
  return "Cancellation"
}

function day(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function dayTime(d: Date): string {
  return `${day(d)} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
}

function money(n: number): string {
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `−$${s}` : `$${s}`
}
