// ============================================================
// Invoice page (Phase 1 spec, P1-09)
// Route: /orders/[orderId]/invoice
//
// The invoice an ERP order is on, as Dia-Co prints it, ready to print or save as a PDF (InvoicePrintBar). Only for a
// login with "View invoices" (src/lib/erp/erpInvoice.ts); anyone else, an order not invoiced yet, or an order this
// login cannot see is not found. Printed, only the sheet comes out: the app's navigation and the bar are left off, on
// a Letter page with the ERP's own margins.
// ============================================================

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchErpOrderInvoice, viewerCanSeeInvoices } from "@/lib/erp/erpInvoice"
import { ErpInvoicePaper } from "@/components/orders/ErpInvoicePaper"
import { InvoicePrintBar } from "@/components/orders/InvoicePrintBar"
import { INVOICE_PRINT_CSS } from "@/components/orders/invoicePrintCss"

interface InvoicePageProps {
  params: Promise<{ orderId: string }>
}

async function loadInvoice(orderId: string) {
  if (!(await viewerCanSeeInvoices())) return null
  return fetchErpOrderInvoice(orderId)
}

// The tab title is also the PDF's suggested file name.
export async function generateMetadata({ params }: InvoicePageProps): Promise<Metadata> {
  const { orderId } = await params
  const invoice = await loadInvoice(orderId)
  return { title: invoice ? `Invoice ${invoice.invoice_no} · Dia-Co` : "Invoice not found · Dia-Co" }
}


export default async function InvoicePage({ params }: InvoicePageProps) {
  const { orderId } = await params
  const invoice = await loadInvoice(orderId)
  if (!invoice) notFound()

  return (
    <div className="diaco-design inv-screen">
      <style>{INVOICE_PRINT_CSS}</style>
      <InvoicePrintBar orderId={orderId} invoiceNo={invoice.invoice_no} />
      <div className="inv-scroll">
        <ErpInvoicePaper invoice={invoice} />
      </div>
    </div>
  )
}
