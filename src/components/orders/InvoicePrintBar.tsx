"use client"

// ============================================================
// InvoicePrintBar (Phase 1 spec, P1-09)
// The bar above the invoice: back to the order, and Download PDF — the browser's print dialog, where "Save as PDF" makes
// the file. That is how the ERP makes every PDF it gives a customer (its AR statement says "Print / Save as PDF"). The
// bar itself never prints.
// ============================================================

import Link from "next/link"

export function InvoicePrintBar({ orderId, invoiceNo }: { orderId: string; invoiceNo: string }) {
  return (
    <div className="inv-bar">
      <Link href={`/orders/${encodeURIComponent(orderId)}`} className="btn btn--ghost">
        ← Back to {orderId}
      </Link>
      <span className="inv-bar__hint">
        Invoice {invoiceNo} · in the print dialog, choose <b>Save as PDF</b> to keep a copy.
      </span>
      <button type="button" className="btn" onClick={() => window.print()}>
        Download PDF
      </button>
    </div>
  )
}
