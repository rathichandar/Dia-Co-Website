// The gate on every /api/erp/* route: the ERP's portal-admin Edge Function signs each call with
// ERP_ADMIN_SECRET (ERP_INTEGRATION_CONTRACT.md §4.3). Nothing in the body is looked at until the
// signature checks out. These routes have no user session -- the signature IS the caller's identity.

import { HEADERS, signedRecently } from './signing'

const MAX_BODY = 64 * 1024

export type ErpBody = Record<string, unknown>

export const erpReply = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function readSignedErpRequest(
  req: Request,
): Promise<{ ok: true; body: ErpBody } | { ok: false; response: Response }> {
  const raw = await req.text()
  if (raw.length > MAX_BODY) {
    return { ok: false, response: erpReply(413, { ok: false, code: 'PORTAL_INVALID', message: 'The request is too large.' }) }
  }
  const signed = signedRecently(
    process.env.ERP_ADMIN_SECRET,
    req.headers.get(HEADERS.fromErp.timestamp),
    raw,
    req.headers.get(HEADERS.fromErp.signature),
    Date.now() / 1000,
  )
  if (!signed) {
    return { ok: false, response: erpReply(401, { ok: false, code: 'ERP_UNSIGNED', message: 'The request is not signed by Dia-Co.' }) }
  }
  try {
    const body = JSON.parse(raw) as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object')
    return { ok: true, body: body as ErpBody }
  } catch {
    return { ok: false, response: erpReply(400, { ok: false, code: 'PORTAL_INVALID', message: 'The body is not a JSON object.' }) }
  }
}

export const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export const str = (b: ErpBody, k: string) => (typeof b[k] === 'string' ? (b[k] as string).trim() : '')
