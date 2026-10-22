// ============================================================
// An order's invoice, read from the ERP (Phase 1 spec, P1-09).
//
// The ERP sends the invoice as its own printed invoice reads it (db/2026-10-22-portal-invoice.sql, operation
// order.invoice): the header, every order on the invoice with its lines' cells already as the paper prints them, the
// credit-memo discounts under the order each names, shipping and the total after them. The Portal draws that paper and
// the browser prints it to PDF — the ERP's own way ("Print / Save as PDF"); nothing here recomputes a price.
//
// Who may see it is the Portal's own rule (owner ruling 2026-10-22): a login with "View invoices" (Customer Admin and
// Accounting by default; a Customer Admin can turn it on for a Sales Rep). The ERP does not know the Portal's flags.
// ============================================================

import { cache } from 'react'
import { callGateway } from './gateway'
import { createClient } from '@/lib/supabase/server'

import type { ErpInvoice } from './invoicePaper'
export type { ErpInvoice, ErpInvoiceDiscount, ErpInvoiceGroup, ErpInvoiceLine } from './invoicePaper'
export { invoiceMoney } from './invoicePaper'

const EXPECTED = new Set(['PORTAL_NOT_CONFIGURED', 'PORTAL_FORBIDDEN', 'PORTAL_NOT_FOUND'])

// Whether the signed-in login may see invoices ("View invoices" on their profile). false on any doubt.
export const viewerCanSeeInvoices = cache(async (): Promise<boolean> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data, error } = await supabase
    .from('user_profiles')
    .select('can_view_invoices, deactivated_at')
    .eq('id', user.id)
    .maybeSingle()
  if (error || !data) return false
  return data.can_view_invoices === true && !data.deactivated_at
})

// The invoice the order is on; null while it is not invoiced, or when the ERP cannot answer (the page then shows none).
export const fetchErpOrderInvoice = cache(async (orderNumber: string): Promise<ErpInvoice | null> => {
  const res = await callGateway<{ ok: true; order_no: string; invoice: ErpInvoice | null }>('order.invoice', { order_no: orderNumber })
  if (!res.ok) {
    if (!EXPECTED.has(res.code)) {
      console.error('[erpInvoice] order.invoice failed; showing the order without its invoice:', { code: res.code, message: res.message })
    }
    return null
  }
  return res.data.invoice ?? null
})
