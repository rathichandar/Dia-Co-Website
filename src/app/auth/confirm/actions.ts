'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sanitizeRedirectTo } from '@/lib/auth/redirect'

// Email-link types this page accepts. Invites are the reason it exists;
// recovery covers a reset sent from the Supabase dashboard, which (like an
// invite) is generated server-side and so carries no PKCE verifier.
const ALLOWED_TYPES: ReadonlySet<EmailOtpType> = new Set<EmailOtpType>([
  'invite',
  'recovery',
])

// Verifies the one-time token from the email link and starts the session.
// A Server Action, so only a real POST from the Continue button can spend
// the token — never a GET prefetch or an email scanner.
export async function confirmEmailLinkAction(formData: FormData) {
  const tokenHash = String(formData.get('token_hash') ?? '')
  const type = String(formData.get('type') ?? '') as EmailOtpType
  const next = sanitizeRedirectTo(String(formData.get('next') ?? ''))

  if (!tokenHash || !ALLOWED_TYPES.has(type)) {
    redirect('/login?error=link_invalid')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error) {
    console.error('[auth/confirm] verifyOtp error:', error.message)
    redirect('/login?error=link_invalid')
  }

  // Same cookie-flush workaround as loginAction: without a revalidation the
  // session cookies set by verifyOtp can be dropped on the Server Action
  // redirect on Vercel.
  revalidatePath('/', 'layout')

  redirect(next)
}
