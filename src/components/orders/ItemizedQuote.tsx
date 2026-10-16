"use client"

// ============================================================
// ItemizedQuote
// Quote tied to the active CAD version. Mono numbers, brown
// uppercase group eyebrows, indented sub-items.
// ============================================================

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { CadVersion, PriorityRush, QuoteLineItem } from "@/types/order"
import { computeDisplayedQuote } from "@/lib/quote"

interface ItemizedQuoteProps {
  activeVersion: CadVersion
  priorityRush: PriorityRush
  isRushOn: boolean
  isOnLatest: boolean
  latestVersionNumber: string
}

export function ItemizedQuote({
  activeVersion,
  priorityRush,
  isRushOn,
  isOnLatest,
  latestVersionNumber,
}: ItemizedQuoteProps) {
  const [isOpen, setIsOpen] = useState(true)
  const baseQuote = activeVersion.quote
  const quote = computeDisplayedQuote(baseQuote, priorityRush, isRushOn)

  const validityState = computeValidityState(quote.validity)

  const versionLabel = activeVersion.isLatest
    ? `${activeVersion.versionNumber} (latest)`
    : activeVersion.versionNumber

  return (
    <section className={`quote-card ${isOnLatest ? "" : "is-past"}`}>
      <button
        type="button"
        className="quote-card__head"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="quote-card__head-left">
          <span className="h-eyebrow">
            Itemized quote · CAD {versionLabel}
          </span>
          <span className="h-total">{formatCurrency(quote.estimatedTotal)}</span>
        </span>
        <span className="quote-card__head-right">
          {!isOnLatest && (
            <span className="h-tag">You&apos;re viewing a previous version</span>
          )}
          {isOnLatest && validityState.label && (
            <span className="h-tag h-tag--warn">{validityState.label}</span>
          )}
          <span className="quote-card__chev">
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="quote-card__body">
          {!isOnLatest && (
            <div className="past-warn">
              This is the quote tied to CAD {activeVersion.versionNumber},
              which has been superseded by CAD {latestVersionNumber}. To approve
              an order, switch to CAD {latestVersionNumber}. To revert to this
              design, request a modification.
            </div>
          )}

          <table className="quote-table">
            <tbody>
              {quote.lineItems.map((item, idx) => (
                <LineItemRow key={idx} item={item} />
              ))}
              <tr className="q-total">
                <td className="q-label">Estimated total</td>
                <td className="q-qty"></td>
                <td className="q-total">{formatCurrency(quote.estimatedTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div className="meta-notes">
            <p style={{ margin: 0 }}>{quote.estimatedTotalNote}</p>
            {validityState.detail && (
              <p style={{ margin: "6px 0 0" }}>{validityState.detail}</p>
            )}
            {quote.pdfUrl && (
              <p style={{ margin: "10px 0 0" }}>
                <a
                  href={quote.pdfUrl}
                  style={{ color: "var(--dc-brown)", textDecoration: "underline" }}
                >
                  Download quote PDF
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Line item row ────────────────────────────────────────

function LineItemRow({ item }: { item: QuoteLineItem }) {
  if (item.isGroupHeader) {
    return (
      <tr className="q-group">
        <td className="q-label">
          {item.label}
          {item.subLabel && <span className="sub">{item.subLabel}</span>}
        </td>
        <td className="q-qty"></td>
        <td className="q-total">{formatCurrency(item.total)}</td>
      </tr>
    )
  }

  const isSubItem = item.indent === 1

  return (
    <tr>
      <td className={`q-label ${isSubItem ? "indent" : ""}`}>
        {item.label}
        {item.subLabel && <span className="sub">{item.subLabel}</span>}
      </td>
      <td className="q-qty">{formatQtyUnit(item)}</td>
      <td className="q-total">
        {item.flag === "free" ? (
          <em style={{ color: "var(--dc-brown)", fontStyle: "normal" }}>Free</em>
        ) : item.flag === "included" ? (
          <em style={{ color: "var(--dc-brown)", fontStyle: "normal" }}>Included</em>
        ) : (
          formatCurrency(item.total)
        )}
      </td>
    </tr>
  )
}

// ─── Formatters ────────────────────────────────────────────

function formatCurrency(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatQtyUnit(item: QuoteLineItem): string {
  if (item.qty === null || item.qty === undefined) return ""
  if (!item.unitPrice) return ""

  const qtyStr =
    item.qtyUnit === "g" || item.qtyUnit === "ct"
      ? item.qty.toFixed(2)
      : String(item.qty)

  const unitStr = item.qtyUnit ? ` ${item.qtyUnit}` : ""
  const priceStr = ` @ $${item.unitPrice.toFixed(2)}${
    item.qtyUnit ? "/" + item.qtyUnit : ""
  }`

  return `${qtyStr}${unitStr}${priceStr}`
}

// ─── Validity state ───────────────────────────────────────

interface ValidityState {
  label: string | null
  detail: string | null
}

function computeValidityState(validity: {
  issuedAt: Date
  validForDays: number
  warningAtDays: number
}): ValidityState {
  const now = new Date()
  const daysSinceIssue = Math.floor(
    (now.getTime() - validity.issuedAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  const daysRemaining = validity.validForDays - daysSinceIssue
  const issuedStr = validity.issuedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  if (daysRemaining <= 0) {
    return {
      label: "Outdated",
      detail: `Quote issued ${issuedStr} — past the ${validity.validForDays}-day validity window. Request a refreshed quote.`,
    }
  }

  if (daysSinceIssue >= validity.warningAtDays) {
    return {
      label: `Expires in ${daysRemaining}d`,
      detail: `Quote issued ${issuedStr} — valid for ${validity.validForDays} days.`,
    }
  }

  return {
    label: null,
    detail: `Quote issued ${issuedStr} — valid for ${validity.validForDays} days.`,
  }
}
