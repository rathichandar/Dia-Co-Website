/**
 * Phase 2C Sub-session 1: seed two auth.users rows for Phase 2C login testing.
 *
 *   Account 1: Arpit@diacoglobal.com  (will be linked to user_profiles role=super_admin)
 *   Account 2: Arbhanderi722@gmail.com (will be linked to Heritage Fine Jewelers
 *                                       customer_admin profile via Migration E)
 *
 * Migration E (20260525000005_seed_user_profiles.sql) inserts the matching
 * user_profiles rows by looking up auth.users by lowercased email AFTER this
 * script runs.
 *
 * Usage:
 *   npx tsx scripts/seed-auth-accounts.ts
 *
 * Idempotent: rerunning logs "already exists, skipping" for any account that
 * already has an auth.users row.
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (both in .env.local).
 * Service-role key bypasses RLS — never ship this script's keys to the client.
 */

// Load env BEFORE any other import that might read process.env.
// Matches the convention in scripts/seed-dg-10001.ts.
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  )
  process.exit(1)
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type Account = {
  email: string
  password: string
}

const ACCOUNTS: Account[] = [
  { email: 'Arpit@diacoglobal.com', password: 'ChangeMeNow!' },
  { email: 'Arbhanderi722@gmail.com', password: 'ChangeMeNow!' },
]

/**
 * Recognize the "email already registered" error coming back from
 * supabase.auth.admin.createUser. supabase-js 2.x surfaces this as an
 * AuthApiError with code 'email_exists' (newer) and/or a message like
 * "A user with this email address has already been registered".
 * Match on either to be resilient across minor version drift.
 */
function isAlreadyExistsError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string; status?: number }
  if (e.code === 'email_exists') return true
  if (typeof e.message === 'string' && /already.*registered/i.test(e.message)) return true
  return false
}

async function seedAccount({ email, password }: Account): Promise<void> {
  console.log(`→ ${email}`)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!error && data?.user) {
    console.log(`  ✓ created (id ${data.user.id})`)
    return
  }

  if (error && isAlreadyExistsError(error)) {
    console.log(`  ⊙ already exists, skipping`)
    return
  }

  // Unexpected error — surface and abort. Don't swallow.
  console.error(`  ✗ createUser failed for ${email}`)
  throw error ?? new Error('createUser returned neither user nor error')
}

async function main() {
  console.log(`Seeding ${ACCOUNTS.length} auth.users rows on ${SUPABASE_URL}\n`)
  for (const account of ACCOUNTS) {
    await seedAccount(account)
  }
  console.log(`\nDone. Apply migration 20260525000005_seed_user_profiles.sql next to populate user_profiles.`)
}

main().catch((err) => {
  console.error('\nSeed failed:', err?.message ?? err)
  if (err?.code) console.error('  code:', err.code)
  if (err?.status) console.error('  status:', err.status)
  process.exit(1)
})
