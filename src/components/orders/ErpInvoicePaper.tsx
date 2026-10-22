// ============================================================
// ErpInvoicePaper (Phase 1 spec, P1-09)
// The ERP's printed invoice, drawn as the ERP draws it (PriceDoc, ERP part 74; its .jb-page sheet): the title, Dia-Co's
// block with the invoice date, Company / Invoice No / Due; one row per order on the invoice (the paper's own label),
// its lines in shop order with the department named once per run, RJO lines in red, ADDED marked; the Sub Total, each
// discount under it in red and the Sub Total after discount; Shipping; Total; "Thank you for your business." and the
// Made in USA seal. Every cell is the ERP's own text (src/lib/erp/erpInvoice.ts) — nothing here recomputes a price.
// The page around it prints it; the browser saves it as a PDF.
// ============================================================

import type { ErpInvoice, ErpInvoiceDiscount, ErpInvoiceGroup } from "@/lib/erp/invoicePaper"
import { invoiceMoney as money } from "@/lib/erp/invoicePaper"

const COLS = ["Department", "Process", "Pc", "Wt", "Rate", "Qty", "Amount"]

export function ErpInvoicePaper({ invoice }: { invoice: ErpInvoice }) {
  return (
    <div className="inv-page">
      <div className="inv-title">Invoice</div>
      <table className="inv-head">
        <tbody>
          <tr>
            <td className="inv-head__logo">
              {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is, no optimisation wanted */}
              <img src="/invoice/diaco-logo.png" alt="Dia-Co Jewelry" />
            </td>
            <td className="inv-head__from">
              <div className="inv-brand">DIA-CO JEWELRY, INC.</div>
              <div>550 S. HILL STREET #1055</div>
              <div>LOS ANGELES, CA 90013</div>
              <div>213-622-9608</div>
              <div className="inv-head__date">{invoice.date}</div>
            </td>
            <td className="inv-head__to">
              <div><b>Company :</b> {invoice.company}</div>
              <div><b>Invoice No :</b> {invoice.invoice_no}</div>
              {invoice.due && <div><b>Due :</b> {invoice.due}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="inv-lines">
        <thead>
          <tr>
            {COLS.map((c, i) => (
              <th key={c} className={i > 1 ? "num" : undefined}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoice.groups.map((g, gi) => (
            <GroupRows key={gi} group={g} />
          ))}
          {invoice.discounts.length > 0 && <LessRows discounts={invoice.discounts} after={invoice.after_discount} />}
          <tr>
            <td colSpan={6} className="num">Shipping :</td>
            <td className="num">{money(invoice.shipping)}</td>
          </tr>
          <tr className="inv-total">
            <td colSpan={6} className="num">Total :</td>
            <td className="num">{money(invoice.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="inv-foot">
        <div className="inv-foot__thanks">Thank you for your business.</div>
        {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is, no optimisation wanted */}
        <img className="inv-foot__seal" src="/invoice/diaco-usa-seal.jpg" alt="Proudly made in USA" />
      </div>
    </div>
  )
}

// the department once per run, as the paper names it: shown where it differs from the last one named
function deptShown(lines: ErpInvoiceGroup["lines"]): boolean[] {
  const out: boolean[] = []
  let last: string | null = null
  for (const l of lines) {
    out.push(!!l.dept && l.dept !== last)
    last = l.dept || last
  }
  return out
}

function GroupRows({ group }: { group: ErpInvoiceGroup }) {
  const shown = deptShown(group.lines)
  return (
    <>
      <tr className="inv-label">
        <td colSpan={7}>{group.label}</td>
      </tr>
      {group.lines.map((l, i) => {
        return (
          <tr key={i}>
            <td>{shown[i] ? l.dept : ""}</td>
            <td className={l.rjo ? "inv-rjo inv-rjo--process" : undefined}>
              {l.process}
              {l.added && <span className="inv-added">ADDED</span>}
            </td>
            <td className="num">{l.pc}</td>
            <td className="num">{l.wt}</td>
            <td className="num">{l.rate}</td>
            <td className="num">{l.qty}</td>
            <td className={l.rjo ? "num inv-rjo" : "num"}>{money(l.amount)}</td>
          </tr>
        )
      })}
      <tr className="inv-sub">
        <td colSpan={6}>Sub Total :</td>
        <td>{money(group.sub_total)}</td>
      </tr>
      {group.discounts.length > 0 && <LessRows discounts={group.discounts} after={group.after_discount} />}
    </>
  )
}

// a discount under a Sub Total: the credit memo and the money taken off, in red, then the Sub Total after discount
function LessRows({ discounts, after }: { discounts: ErpInvoiceDiscount[]; after: number | null }) {
  return (
    <>
      {discounts.map((d, i) => (
        <tr key={i} className="inv-less">
          <td colSpan={6}>Discount {d.doc_no} :</td>
          <td>{"−" + money(d.amount)}</td>
        </tr>
      ))}
      {after !== null && (
        <tr className="inv-sub">
          <td colSpan={6}>Sub Total after discount :</td>
          <td>{money(after)}</td>
        </tr>
      )}
    </>
  )
}
