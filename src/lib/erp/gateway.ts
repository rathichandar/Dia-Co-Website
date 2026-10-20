// The Portal's one way into the ERP: a signed POST to its portal-gateway Edge Function
// (ERP_INTEGRATION_CONTRACT.md §4.1, §5). Server-only -- call it from Server Actions and Route Handlers.
//
// Every call carries the signed-in customer's own access token (X-Portal-User-Token). The ERP verifies
// it with this project's Auth and decides, itself, which ERP customer the login belongs to. Nothing here
// sends a customer code, a user id or an email as a claim -- the ERP would ignore them anyway.
//
// Not configured (ERP_GATEWAY_URL / PORTAL_GATEWAY_SECRET unset) is a normal state for local dev: every
// call answers PORTAL_NOT_CONFIGURED and the caller carries on without ERP data.

import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { HEADERS, signBody } from './signing'

export type GatewayOp =
  | 'whoami'
  | 'link.confirm'
  | 'orders.list'
  | 'order.get'
  | 'order.submit'
  | 'submissions.list'
  | 'order.design'

export type GatewayResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number }

export type WhoAmI = {
  ok: true
  customer_code: string
  customer_name: string
  role: 'customer_admin' | 'sales_rep' | 'accounting'
  link_id: number
}

export function erpConfigured(): boolean {
  return Boolean(process.env.ERP_GATEWAY_URL && process.env.PORTAL_GATEWAY_SECRET)
}

// The ERP's refusal as the customer reads it: its own sentence, without the 'PORTAL_<KIND>: ' code and with
// its ' -- ' as a dash (contract §5: the Portal shows the server's sentence as written).
export function erpSentence(r: { message: string }): string {
  const m = /^PORTAL_[A-Z_]+:\s*([\s\S]*)$/.exec(r.message.trim())
  const body = (m ? m[1] : r.message).replace(/\s+--\s+/g, ' — ').trim()
  if (!body) return 'Dia-Co could not answer just now. Try again shortly.'
  return body.charAt(0).toUpperCase() + body.slice(1) + (/[.!?]$/.test(body) ? '' : '.')
}

export async function callGateway<T = Record<string, unknown>>(
  op: GatewayOp,
  payload: Record<string, unknown> = {},
): Promise<GatewayResult<T>> {
  const url = process.env.ERP_GATEWAY_URL
  const secret = process.env.PORTAL_GATEWAY_SECRET
  if (!url || !secret) {
    return { ok: false, code: 'PORTAL_NOT_CONFIGURED', message: 'The Dia-Co connection is not set up on this server.', status: 0 }
  }

  // The access token only travels; the ERP verifies it with this project's Auth before trusting it.
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { ok: false, code: 'PORTAL_FORBIDDEN', message: 'Your sign-in has expired. Sign in again.', status: 401 }
  }

  const raw = JSON.stringify({ op, request_id: randomUUID(), payload })
  const { timestamp, signature } = signBody(secret, raw, Date.now() / 1000)
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [HEADERS.toErp.timestamp]: timestamp,
        [HEADERS.toErp.signature]: signature,
        [HEADERS.toErp.userToken]: session.access_token,
      },
      body: raw,
      cache: 'no-store',
    })
    const data = (await r.json().catch(() => null)) as Record<string, unknown> | null
    if (r.ok && data?.ok === true) return { ok: true, data: data as T }
    return {
      ok: false,
      code: typeof data?.code === 'string' ? data.code : 'PORTAL_ERROR',
      message: typeof data?.message === 'string' ? data.message : `Dia-Co answered ${r.status}.`,
      status: r.status,
    }
  } catch {
    return { ok: false, code: 'PORTAL_UNREACHABLE', message: 'Could not reach Dia-Co just now. Try again shortly.', status: 0 }
  }
}
