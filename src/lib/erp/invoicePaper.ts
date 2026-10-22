// ============================================================
// An ERP invoice as its paper reads it (Phase 1 spec, P1-09): the shape the ERP's order.invoice operation answers with
// (db/2026-10-22-portal-invoice.sql), and the paper's money format. No server code here, so the paper and the card
// can be drawn anywhere; reading it is src/lib/erp/erpInvoice.ts.
// ============================================================

export interface ErpInvoiceLine {
  dept: string
  process: string
  pc: string
  wt: string
  rate: string
  qty: string
  amount: number
  rjo: boolean
  added: boolean
}

export interface ErpInvoiceDiscount {
  doc_no: string
  amount: number
}

export interface ErpInvoiceGroup {
  order_no: string
  style_no: string | null
  ref_po: string | null
  personal_po: string | null
  // the paper's own row label: "AB-1 · R-2  ·  Ref PO X  ·  Personal PO Y"
  label: string
  lines: ErpInvoiceLine[]
  sub_total: number
  discounts: ErpInvoiceDiscount[]
  after_discount: number | null
}

export interface ErpInvoice {
  invoice_no: string
  date: string // M/D/YYYY, as the paper prints it
  due: string // M/D/YYYY, or "" when none
  company: string
  groups: ErpInvoiceGroup[]
  // discounts that name no order on a multi-order invoice: printed after every order
  discounts: ErpInvoiceDiscount[]
  after_discount: number | null
  shipping: number
  total: number
}

// money(): the ERP paper's own — en-US, two decimals, no "$".
export function invoiceMoney(n: number): string {
  return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
