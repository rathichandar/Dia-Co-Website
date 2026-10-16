/**
 * ERP integration Step 1 — checks the Portal's copy of the request-signing format
 * (src/lib/erp/signing.ts) against the vector the ERP's portal.test.js pins.
 * If this fails, the two systems no longer agree on a signature and every call between
 * them will be refused.
 *
 * Usage: npm run check:erp-signing
 */
import { HEADERS, KNOWN_VECTOR, signBody, signedRecently, WINDOW_SECONDS } from '../src/lib/erp/signing'

const results: Array<[string, boolean]> = []
const check = (name: string, ok: boolean) => results.push([name, ok])

const { secret, timestamp, body, signature } = KNOWN_VECTOR
const now = Number(timestamp)

check('the known vector: same signature as the ERP pins', signBody(secret, body, now).signature === signature)
check('the known vector: the timestamp is whole Unix seconds', signBody(secret, body, now + 0.9).timestamp === timestamp)
check('accepts its own signature', signedRecently(secret, timestamp, body, signature, now + 10))
check(`accepts at the edge of the window (${WINDOW_SECONDS}s)`, signedRecently(secret, timestamp, body, signature, now + WINDOW_SECONDS))
check('refuses one second past the window', !signedRecently(secret, timestamp, body, signature, now + WINDOW_SECONDS + 1))
check('refuses a timestamp from the future past the window', !signedRecently(secret, timestamp, body, signature, now - WINDOW_SECONDS - 1))
check('refuses a changed body', !signedRecently(secret, timestamp, body + ' ', signature, now))
check('refuses a different secret', !signedRecently('another-secret', timestamp, body, signature, now))
check('refuses when no secret is configured', !signedRecently(undefined, timestamp, body, signature, now))
check('refuses an upper-case signature (hex is lower-case only)', !signedRecently(secret, timestamp, body, signature.toUpperCase(), now))
check('refuses a missing signature', !signedRecently(secret, timestamp, body, null, now))
check('the header names match the ERP functions', HEADERS.toErp.timestamp === 'X-Portal-Timestamp'
  && HEADERS.toErp.signature === 'X-Portal-Signature' && HEADERS.toErp.userToken === 'X-Portal-User-Token'
  && HEADERS.fromErp.timestamp === 'x-erp-timestamp' && HEADERS.fromErp.signature === 'x-erp-signature')

let failed = 0
for (const [name, ok] of results) {
  if (!ok) failed++
  console.log((ok ? '  ok    ' : '  FAIL  ') + name)
}
console.log(`\n${results.length - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
