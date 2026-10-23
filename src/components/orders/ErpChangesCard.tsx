"use client"

// ============================================================
// ErpChangesCard (2026-10-23)
// "Changed by Dia-Co": at the top of an ERP order's right rail, each
// detail Dia-Co changed of what the customer sent -- what they sent,
// what it is now, and Dia-Co's note -- grouped by when (newest first;
// the changes made while the order was created are one group). A change
// made since this browser last showed the order's page reads "New"
// (src/lib/orders/changesSeen.ts). "Ask about a change" sends a
// question to the account manager (a request of kind "question"; the
// rail owns its dialog). The customer is never told who at Dia-Co made
// a change.
// ============================================================

import { useEffect } from "react"
import type { ErpChange } from "@/types/order"
import { groupChanges, isNewChange, latestChangeAt } from "@/lib/orders/erpChanges"
import { useChangesSeenBefore, writeChangesSeen } from "@/lib/orders/changesSeen"

// What the card's foot offers: the question button; the open question (one at a time); a line saying to reply to
// the account manager (the ERP's request list did not answer); or nothing (a cancelled order).
export type ErpChangesAsk =
  | { kind: "ask"; onAsk: () => void }
  | { kind: "pending"; askedOn: string }
  | { kind: "contact" }
  | { kind: "none" }

interface ErpChangesCardProps {
  orderNo: string
  changes: ErpChange[]
  // the designs sent for review, so a later day can say "with design v2"
  designs: { label: string; at: Date }[]
  ask: ErpChangesAsk
}

export function ErpChangesCard({ orderNo, changes, designs, ask }: ErpChangesCardProps) {
  const seenBefore = useChangesSeenBefore(orderNo)
  const latest = latestChangeAt(changes)
  // Once shown, these changes are no longer new on the next visit (or in the orders list).
  useEffect(() => {
    if (latest) writeChangesSeen(orderNo, latest)
  }, [orderNo, latest])
  return <ErpChangesCardView changes={changes} designs={designs} seenBefore={seenBefore} ask={ask} />
}

// The card itself, given what this browser had seen (undefined: not known yet, so nothing reads as new).
export function ErpChangesCardView({
  changes,
  designs,
  seenBefore,
  ask,
}: {
  changes: ErpChange[]
  designs: { label: string; at: Date }[]
  seenBefore: string | null | undefined
  ask: ErpChangesAsk
}) {
  if (!changes.length) return null
  const groups = groupChanges(changes, designs)
  return (
    <aside id="changes" className="erp-req erp-chg" aria-labelledby="erp-chg-title">
      <div>
        <div className="erp-chg__eyebrow">Changed by Dia-Co · {changes.length}</div>
        <h3 id="erp-chg-title" className="erp-rail__title erp-chg__title">
          Your order differs from what you sent
        </h3>
        <p className="erp-rail__text erp-chg__intro">
          Your account manager changed these details. Everything else is as you sent it.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.key} className="erp-chg__group">
          <div className="erp-chg__when">{g.heading}</div>
          {g.changes.map((c, i) => (
            <div key={`${c.at}-${i}`} className="erp-chg__item">
              <div className="erp-chg__head">
                <span className="erp-req__name">{c.what}</span>
                {isNewChange(c.at, seenBefore) && <span className="badge badge--dark">New</span>}
              </div>
              <div className="erp-chg__grid">
                <span>You sent</span>
                {c.was !== null ? <s>{c.was}</s> : <span>Nothing</span>}
                <span>Now</span>
                {c.now !== null ? <strong>{c.now}</strong> : <span>Removed</span>}
              </div>
              {c.note && (
                <p className="erp-chg__note">
                  <b>Dia-Co:</b> {c.note}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}

      {ask.kind !== "none" && (
        <div className="erp-chg__foot">
          {ask.kind === "ask" && (
            <>
              <button type="button" className="btn btn--sec btn--sm" onClick={ask.onAsk}>
                Ask about a change
              </button>
              <span>Goes to your account manager.</span>
            </>
          )}
          {ask.kind === "pending" && (
            <>
              <span className="erp-req__chip erp-req__chip--pending">Pending</span>
              <span>You asked about a change on {ask.askedOn}. Your account manager&rsquo;s reply shows under Your requests.</span>
            </>
          )}
          {ask.kind === "contact" && <span>To ask about a change, reply to your Dia-Co account manager.</span>}
        </div>
      )}
    </aside>
  )
}
