// Request signing between the Portal and the ERP (ERP_INTEGRATION_CONTRACT.md §4).
//
// ONE FORMAT, both directions -- the ERP's copy is supabase/functions/_shared/signing.ts in the ERP repo:
//   signature = lowercase hex of HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
//   timestamp = Unix seconds as a decimal string; refused when more than WINDOW_SECONDS off our clock
//   Portal -> ERP (portal-gateway):  X-Portal-Timestamp / X-Portal-Signature, secret PORTAL_GATEWAY_SECRET
//   ERP -> Portal (/api/erp/*):      X-Erp-Timestamp    / X-Erp-Signature,    secret ERP_ADMIN_SECRET
// Both sides pin the same known vector (KNOWN_VECTOR below; the ERP's portal.test.js), so a change to
// either copy is caught. Server-only: never import this from a client component.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const WINDOW_SECONDS = 300

export const HEADERS = {
  toErp: { timestamp: 'X-Portal-Timestamp', signature: 'X-Portal-Signature', userToken: 'X-Portal-User-Token' },
  fromErp: { timestamp: 'x-erp-timestamp', signature: 'x-erp-signature' },
} as const

// secret 'dia-co-test-secret', timestamp 1760000000, body {"op":"whoami"} -- checked by
// scripts/check-erp-signing.ts here and by the ERP's portal.test.js.
export const KNOWN_VECTOR = {
  secret: 'dia-co-test-secret',
  timestamp: '1760000000',
  body: '{"op":"whoami"}',
  signature: '80a3acac1c5f3281822f2a1119441e5fd77588b19c750b6d69512b819bac998a',
} as const

export function hmacHex(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('hex')
}

export function signBody(
  secret: string,
  rawBody: string,
  nowSeconds: number,
): { timestamp: string; signature: string } {
  const timestamp = String(Math.floor(nowSeconds))
  return { timestamp, signature: hmacHex(secret, `${timestamp}.${rawBody}`) }
}

// Is this body signed by someone holding the secret, recently? A missing secret refuses everything.
export function signedRecently(
  secret: string | undefined,
  timestamp: string | null,
  rawBody: string,
  signature: string | null,
  nowSeconds: number,
): boolean {
  if (!secret || !timestamp || !signature) return false
  if (!/^[0-9]{1,12}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false
  if (Math.abs(nowSeconds - Number(timestamp)) > WINDOW_SECONDS) return false
  const expected = Buffer.from(hmacHex(secret, `${timestamp}.${rawBody}`), 'hex')
  const given = Buffer.from(signature, 'hex')
  return expected.length === given.length && timingSafeEqual(expected, given)
}
