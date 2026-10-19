// What became of the orders this customer sent to Dia-Co (ERP_INTEGRATION_CONTRACT.md §6 — Step 3).
//
// A sent order is the Portal's own row with status 'submitted' (record_erp_submission). The ERP keeps the
// receipt and decides its fate; submissions.list answers, for each order sent, the latest receipt:
//   received  — waiting for an AM            -> a "Received" card on the Active tab
//   converted — an AM created the real order -> that ERP order is in orders.list; its card keeps the
//                                               customer's own label (end customer, PO) from this row
//   declined  — an AM declined it            -> back on the Drafts tab with the reason, to change and send
//                                               again (reopenDeclinedOrder)
// Read-only: rendering a page never changes a row (side effects stay behind POST — PROJECT_CONTEXT §13).

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { callGateway, erpConfigured } from './gateway'

export interface ErpSubmission {
  submission_id: string
  portal_order_id: string
  status: 'received' | 'converted' | 'declined'
  received_at: string | null
  decided_at: string | null
  order_no: string | null
  decline_reason: string | null
}

export interface SentOrder {
  id: string
  clientPo: string | null
  endCustomerName: string | null
  productTypeName: string | null
  finishPoint: string | null
  submittedAt: Date | null
  updatedAt: Date
  submittedByName: string | null
}

export interface SubmissionState {
  received: SentOrder[]                                  // waiting at Dia-Co (or the ERP could not say)
  converted: Map<string, SentOrder>                      // by ERP order number
  declined: (SentOrder & { reason: string; declinedAt: Date | null })[]
}

const EMPTY: SubmissionState = { received: [], converted: new Map(), declined: [] }
const EXPECTED_NO_ERP = new Set(['PORTAL_NOT_CONFIGURED', 'PORTAL_FORBIDDEN'])
const date = (s: string | null | undefined) => (s ? new Date(s) : null)

// cache(): the list, the counts and the Drafts tab ask for the same state in one request — one gateway call.
export const loadSubmissionState = cache(async (): Promise<SubmissionState> => {
  if (!erpConfigured()) return EMPTY
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('orders')
    .select(
      `
      id, client_po, end_customer_name, finish_point, submitted_at, updated_at,
      product_type:product_types!product_type_id (name),
      submitter:users!submitted_by_user_id (full_name)
      `,
    )
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
  if (error) {
    console.error('[erpSubmissions] sent orders read failed:', error.message)
    return EMPTY
  }
  if (!rows || rows.length === 0) return EMPTY

  const sent: SentOrder[] = rows.map((r: any) => ({
    id: r.id,
    clientPo: r.client_po ?? null,
    endCustomerName: r.end_customer_name ?? null,
    productTypeName: (Array.isArray(r.product_type) ? r.product_type[0]?.name : r.product_type?.name) ?? null,
    finishPoint: r.finish_point ?? null,
    submittedAt: date(r.submitted_at),
    updatedAt: new Date(r.updated_at),
    submittedByName: (Array.isArray(r.submitter) ? r.submitter[0]?.full_name : r.submitter?.full_name) ?? null,
  }))

  const res = await callGateway<{ ok: true; submissions: ErpSubmission[] }>('submissions.list', {})
  if (!res.ok) {
    if (!EXPECTED_NO_ERP.has(res.code)) {
      console.error('[erpSubmissions] submissions.list failed; showing sent orders as received:', { code: res.code, message: res.message })
    }
    return { received: sent, converted: new Map(), declined: [] }
  }

  const byOrder = new Map(res.data.submissions.map((s) => [s.portal_order_id, s]))
  const state: SubmissionState = { received: [], converted: new Map(), declined: [] }
  for (const o of sent) {
    const s = byOrder.get(o.id)
    if (s?.status === 'converted' && s.order_no) state.converted.set(s.order_no, o)
    else if (s?.status === 'declined') state.declined.push({ ...o, reason: s.decline_reason ?? '', declinedAt: date(s.decided_at) })
    else state.received.push(o) // received, or a receipt the ERP no longer lists: still Dia-Co's to answer
  }
  return state
})
