"use client"

// ============================================================
// ErpQuoteCard (ERP integration Step 4a)
// The quote the ERP sent with a design version, as the ERP's printed
// quote reads it: Department · Process · Pcs · Weight · Rate · Qty ·
// Amount, a department named once per run, RJO discount lines in red,
// ADDED lines marked, then the total, the paper's stone caution and
// its disclaimer word for word. Every cell is the ERP's own text —
// nothing here recomputes a price.
// ============================================================

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { CadVersion, ErpQuoteLine } from "@/types/order"

interface ErpQuoteCardProps {
  activeVersion: CadVersion
  isOnLatest: boolean
  latestVersionNumber: string
}

export function ErpQuoteCard({ activeVersion, isOnLatest, latestVersionNumber }: ErpQuoteCardProps) {
  const [isOpen, setIsOpen] = useState(true)
  const quote = activeVersion.erpQuote ?? null
  const versionLabel = activeVersion.isLatest ? `${activeVersion.versionNumber} (latest)` : activeVersion.versionNumber
  const sentOn = activeVersion.deliveredAt.getTime() > 0
    ? activeVersion.deliveredAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null
  // Dia-Co re-sent this version with a new quote: say so, so the customer knows the total changed
  const updatedOn = activeVersion.erpQuoteUpdatedAt
    ? activeVersion.erpQuoteUpdatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null

  if (!quote) {
    return (
      <section className="quote-card">
        <div className="quote-card__head" style={{ cursor: "default" }}>
          <span className="quote-card__head-left">
            <span className="h-eyebrow">Itemized quote · CAD {versionLabel}</span>
          </span>
        </div>
        <div className="quote-card__body">
          <p className="erp-quote__empty">The quote for this design will come from your account manager.</p>
        </div>
      </section>
    )
  }

  const rows = withDeptRuns(quote.lines)

  return (
    <section className={`quote-card ${isOnLatest ? "" : "is-past"}`}>
      <button type="button" className="quote-card__head" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        <span className="quote-card__head-left">
          <span className="h-eyebrow">Itemized quote · CAD {versionLabel}</span>
          <span className="h-total">{money(quote.total)}</span>
        </span>
        <span className="quote-card__head-right">
          {!isOnLatest && <span className="h-tag">You&apos;re viewing a previous version</span>}
          {isOnLatest && updatedOn && <span className="h-tag">Updated {updatedOn}</span>}
          <span className="quote-card__chev">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
        </span>
      </button>

      {isOpen && (
        <div className="quote-card__body">
          {!isOnLatest && (
            <div className="past-warn">
              This is the quote sent with CAD {activeVersion.versionNumber}. The latest is CAD {latestVersionNumber}.
            </div>
          )}

          <div className="erp-quote__scroll">
            <table className="erp-quote">
              <thead>
                <tr>
                  <th scope="col">Department</th>
                  <th scope="col">Process</th>
                  <th scope="col" className="num">Pcs</th>
                  <th scope="col" className="num">Weight</th>
                  <th scope="col" className="num">Rate</th>
                  <th scope="col" className="num">Qty</th>
                  <th scope="col" className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ l, showDept }, i) => (
                  <tr key={i} className={`${showDept && i > 0 ? "is-run" : ""} ${l.rjo ? "is-rjo" : ""}`}>
                    <td className="dept">{showDept ? l.dept : ""}</td>
                    <td className="process">
                      {l.process}
                      {l.added && <span className="erp-quote__added">Added</span>}
                    </td>
                    <td className="num">{l.pc}</td>
                    <td className="num">{l.wt}</td>
                    <td className="num">{l.rate ? `$${l.rate}` : ""}</td>
                    <td className="num">{l.qty}</td>
                    <td className="num amount">{money(l.amount)}</td>
                  </tr>
                ))}
                <tr className="is-total">
                  <td colSpan={6}>Total</td>
                  <td className="num amount">{money(quote.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {quote.caution && quote.cautionNote && (
            <div className="erp-quote__caution" role="note">{quote.cautionNote}</div>
          )}

          <div className="meta-notes">
            {sentOn && <p style={{ margin: 0 }}>Sent with design {activeVersion.versionNumber} on {sentOn}.</p>}
            {updatedOn && <p style={{ margin: sentOn ? "6px 0 0" : 0 }}>Dia-Co updated this quote on {updatedOn}. It replaces the one first sent with this design.</p>}
            {quote.disclaimer && <p style={{ margin: sentOn ? "6px 0 0" : 0 }}>{quote.disclaimer}</p>}
          </div>
        </div>
      )}
    </section>
  )
}

// A department is named on the first line of each run, as on the paper; a line with no department
// (an RJO discount) does not start a new run.
function withDeptRuns(lines: ErpQuoteLine[]): { l: ErpQuoteLine; showDept: boolean }[] {
  const out: { l: ErpQuoteLine; showDept: boolean }[] = []
  let last = ""
  for (const l of lines) {
    out.push({ l, showDept: !!l.dept && l.dept !== last })
    if (l.dept) last = l.dept
  }
  return out
}

// Dollars as the paper prints them, with the sign in front of the dollar sign for a discount.
function money(n: number): string {
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `−$${s}` : `$${s}`
}
