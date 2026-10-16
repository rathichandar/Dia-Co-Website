/**
 * Phase 2C Sub-session 4 — prod auth bug diagnostic.
 *
 * Signs in as Arbhanderi against the configured Supabase project, decodes
 * the access_token, and prints the relevant claims + URL info for comparison
 * against Vercel env vars.
 *
 * Usage:
 *   npx tsx scripts/diagnose-prod-auth.ts
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 */

import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
  console.error('Missing env. Need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.')
  process.exit(1)
}

const EMAIL = 'Arbhanderi722@gmail.com'
const PASSWORD = process.env.DIAG_PASSWORD ?? 'ChangeMeNow!'

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.')
  if (parts.length !== 3) throw new Error(`not a JWT (got ${parts.length} segments)`)
  const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const pad = payloadB64.length % 4 === 0 ? '' : '='.repeat(4 - (payloadB64.length % 4))
  return JSON.parse(Buffer.from(payloadB64 + pad, 'base64').toString('utf8'))
}

async function main() {
  console.log('\n=== environment ===')
  console.log('  NEXT_PUBLIC_SUPABASE_URL =', SUPABASE_URL)
  console.log('  publishable key prefix   =', PUBLISHABLE_KEY!.slice(0, 24) + '...')
  console.log('  attempting signin as     =', EMAIL)
  console.log('  password env override?   =', process.env.DIAG_PASSWORD ? 'yes (DIAG_PASSWORD set)' : 'no (using ChangeMeNow!)')

  const supabase = createClient(SUPABASE_URL!, PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })

  if (error) {
    console.error('\n✗ signInWithPassword FAILED:')
    console.error('  message:', error.message)
    console.error('  status:', error.status)
    console.error('  code:', (error as { code?: string }).code)
    console.error('\nIf password was changed: re-run with DIAG_PASSWORD=<new-password> npx tsx scripts/diagnose-prod-auth.ts')
    process.exit(2)
  }

  if (!data.session || !data.user) {
    console.error('\n✗ signin returned no session/user')
    console.error('  data:', JSON.stringify(data, null, 2))
    process.exit(3)
  }

  console.log('\n=== signin OK ===')
  console.log('  user.id    =', data.user.id)
  console.log('  user.email =', data.user.email)

  console.log('\n=== access_token claims ===')
  const claims = decodeJwtPayload(data.session.access_token)
  console.log('  iss        =', claims.iss, '  ← compare to NEXT_PUBLIC_SUPABASE_URL + /auth/v1')
  console.log('  aud        =', claims.aud)
  console.log('  sub        =', claims.sub)
  console.log('  role       =', claims.role)
  console.log('  email      =', claims.email)
  console.log('  iat        =', claims.iat, '(' + new Date(Number(claims.iat) * 1000).toISOString() + ')')
  console.log('  exp        =', claims.exp, '(' + new Date(Number(claims.exp) * 1000).toISOString() + ')')

  console.log('\n=== sizes for cookie-chunking analysis ===')
  console.log('  access_token length    =', data.session.access_token.length, 'chars')
  console.log('  refresh_token length   =', data.session.refresh_token.length, 'chars')
  console.log('  JSON session length    =', JSON.stringify(data.session).length, 'chars')
  console.log('  base64 of that         =', Buffer.from(JSON.stringify(data.session), 'utf8').toString('base64').length, 'chars (≈ what supabase-ssr stores)')

  console.log('\n=== verification: does NEXT_PUBLIC_SUPABASE_URL match JWT iss? ===')
  const expectedIss = `${SUPABASE_URL!.replace(/\/$/, '')}/auth/v1`
  const issMatches = claims.iss === expectedIss
  console.log('  expected iss =', expectedIss)
  console.log('  actual iss   =', claims.iss)
  console.log('  match        =', issMatches ? '✅ YES' : '❌ NO — this is your bug')
  if (!issMatches) {
    console.log('\n  If iss says a DIFFERENT supabase URL than NEXT_PUBLIC_SUPABASE_URL,')
    console.log('  prod is hitting a different Supabase project than the one this script saw.')
    console.log('  Compare against Vercel env: Project Settings → Environment Variables.')
  }
}

main().catch((err) => {
  console.error('\nDiagnostic script crashed:', err?.message ?? err)
  process.exit(1)
})
