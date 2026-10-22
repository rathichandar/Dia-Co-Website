// ============================================================
// ErpInvoiceCard (Phase 1 spec, P1-09)
// On an invoiced ERP order, for a login with "View invoices": the invoice it is on — number, date, due date, total —
// and a link to the invoice as Dia-Co prints it, which downloads as a PDF. The total is the ERP's (after any
// discounts); nothing here works one out.
// ============================================================

import Link from "next/link"
import type { ErpInvoice } from "@/lib/erp/invoicePaper"
import { invoiceMoney } from "@/lib/erp/invoicePaper"

export function ErpInvoiceCard({ orderId, invoice }: { orderId: string; invoice: ErpInvoice }) {
  const others = invoice.groups.length - 1
  return (
    <section className="erp-invoice" aria-label="Invoice">
      <div className="erp-invoice__main">
        <div className="h-eyebrow">Invoice</div>
        <div className="erp-invoice__no">{invoice.invoice_no}</div>
        <div className="erp-invoice__meta">
          Dated {invoice.date}
          {invoice.due ? ` · due ${invoice.due}` : ""}
          {others > 0 ? ` · with ${others} other order${others === 1 ? "" : "s"}` : ""}
        </div>
      </div>
      <div className="erp-invoice__total">
        <span>Total</span>
        <strong>${invoiceMoney(invoice.total)}</strong>
      </div>
      <Link href={`/orders/${encodeURIComponent(orderId)}/invoice`} className="btn" target="_blank" rel="noopener">
        View &amp; download PDF
      </Link>
    </section>
  )
}
