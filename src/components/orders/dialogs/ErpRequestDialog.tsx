"use client"

// ============================================================
// ErpRequestDialog (ERP integration Step 4b)
// The requests a customer can make on an order read from the ERP:
// approve the design, request changes, Priority Rush, cancel -- and
// (2026-10-23) a question about a change Dia-Co made. Each one
// sends a request through submitErpRequest; none changes the order by
// itself -- an AM acts on it in the ERP. One client key per opening, so a
// second press (or a retry) answers the same request.
// The Phase 1 dialogs beside this file serve the Portal's own orders.
// ============================================================

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "./Dialog"
import { submitErpRequest } from "@/lib/orders/submitErpRequest"
import type { CadVersion, ErpRequestKind, Order } from "@/types/order"

interface ErpRequestDialogProps {
  kind: ErpRequestKind | null
  onClose: () => void
  order: Order
  latestVersion: CadVersion | null
}

export function ErpRequestDialog({ kind, onClose, order, latestVersion }: ErpRequestDialogProps) {
  if (!kind) return null
  // A fresh dialog (and so a fresh client key) every time one opens.
  return <ErpRequestDialogBody key={kind} kind={kind} onClose={onClose} order={order} latestVersion={latestVersion} />
}

function ErpRequestDialogBody({
  kind,
  onClose,
  order,
  latestVersion,
}: {
  kind: ErpRequestKind
  onClose: () => void
  order: Order
  latestVersion: CadVersion | null
}) {
  const router = useRouter()
  const [clientKey] = useState(() => crypto.randomUUID())
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)

  const orderNo = order.softwareOrderId ?? ""
  const v = latestVersion?.versionNumber ?? ""
  const total = latestVersion?.erpQuote?.total ?? null
  const copy = COPY[kind](orderNo, v)
  const needsText = kind === "modify" || kind === "question"

  async function send() {
    if (needsText && !text.trim()) {
      setError(kind === "question" ? "Say what you'd like to ask." : "Say what should change.")
      return
    }
    setBusy(true)
    setError(null)
    const r = await submitErpRequest({
      orderNumber: orderNo,
      kind,
      text: kind === "approve" ? "" : text,
      reviewAt: kind === "approve" ? latestVersion?.erpReviewAt ?? null : null,
      clientKey,
    })
    setBusy(false)
    if (!r.ok) {
      setError(r.error ?? "Your request couldn't be sent just now. Try again shortly.")
      setStale(!!r.stale)
      return
    }
    onClose()
    router.refresh()
  }

  function seeLatest() {
    onClose()
    router.refresh()
  }

  return (
    <Dialog open onClose={busy ? () => {} : onClose} title={copy.title} maxWidth="max-w-xl">
      <p className="text-sm text-neutral-700 leading-relaxed mb-4">{copy.body}</p>

      {kind === "approve" && (
        <div className="grid grid-cols-2 border border-neutral-200 mb-4">
          <div className="px-4 py-3 border-r border-neutral-200">
            <div className="text-xs uppercase tracking-wider text-neutral-500">Design</div>
            <div className="text-sm font-medium mt-1">
              {v}
              {latestVersion && latestVersion.deliveredAt.getTime() > 0
                ? ` · sent ${latestVersion.deliveredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : ""}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-neutral-500">Quote total</div>
            <div className="text-sm font-medium mt-1 tabular-nums">{total !== null ? money(total) : "No quote was sent"}</div>
          </div>
        </div>
      )}

      {kind !== "approve" && (
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2" htmlFor={`erp-req-${kind}`}>
            {copy.label}
            {needsText && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <textarea
            id={`erp-req-${kind}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={needsText ? 5 : 3}
            maxLength={2000}
            disabled={busy}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 resize-none"
            placeholder={copy.placeholder}
          />
        </div>
      )}

      {copy.fine && <p className="text-xs text-neutral-500 leading-relaxed mb-5">{copy.fine}</p>}

      {error && (
        <div role="alert" className="mb-4 border border-red-200 bg-red-50 text-red-800 text-sm px-3 py-2 leading-relaxed">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {stale ? (
          <button
            type="button"
            onClick={seeLatest}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded"
          >
            See the latest
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900"
            >
              {copy.back}
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy || (needsText && !text.trim())}
              className={`px-5 py-2 text-white text-sm font-medium rounded disabled:opacity-50 ${
                kind === "cancel" ? "bg-red-700 hover:bg-red-800" : "bg-neutral-900 hover:bg-neutral-800"
              }`}
            >
              {busy ? "Sending…" : copy.send}
            </button>
          </>
        )}
      </div>
    </Dialog>
  )
}

interface Copy {
  title: string
  body: string
  label?: string
  placeholder?: string
  fine?: string
  back: string
  send: string
}

const COPY: Record<ErpRequestKind, (orderNo: string, v: string) => Copy> = {
  approve: (orderNo, v) => ({
    title: `Approve design ${v}?`,
    body: `You're approving design ${v} for ${orderNo} and the quote it was sent with. Dia-Co records your approval and schedules production.`,
    fine: "Approving also accepts this quote. The stage and the ship date then follow on this page.",
    back: "Not yet",
    send: `Approve design ${v}`,
  }),
  modify: (_orderNo, v) => ({
    title: `Request changes to ${v}`,
    body: "Tell your account manager what should change. They'll send a new version, or ask you about anything that isn't clear.",
    label: "What should change?",
    placeholder: "e.g., Make the band 2.5 mm instead of 2 mm, and lower the center setting slightly.",
    fine: "Pictures can't be attached here yet. To share one, email it to your account manager.",
    back: "Back",
    send: "Send request",
  }),
  rush: (orderNo) => ({
    title: "Ask for Priority Rush",
    body: `Priority Rush moves ${orderNo} to the front of production. Your account manager confirms within 1 business day, including any change to the price or the ship date.`,
    label: "Anything to add (optional)",
    placeholder: "e.g., Needed by Nov 7 for an anniversary.",
    back: "Back",
    send: "Send request",
  }),
  cancel: (orderNo) => ({
    title: `Ask to cancel ${orderNo}?`,
    body: "Your account manager reviews the request and confirms the cancellation. Until then the order carries on.",
    label: "Reason (optional)",
    back: "Keep the order",
    send: "Ask to cancel",
  }),
  question: (orderNo) => ({
    title: "Ask about a change",
    body: `Your account manager changed some details of what you sent for ${orderNo}. Ask them about any of it; their reply shows on this page, under Your requests.`,
    label: "What would you like to ask?",
    placeholder: "e.g., Why is the size now 6.75? My customer measured 6.5.",
    back: "Back",
    send: "Send question",
  }),
}

function money(n: number): string {
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `−$${s}` : `$${s}`
}
