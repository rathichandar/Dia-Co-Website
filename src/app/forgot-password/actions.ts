'use server'

// POST-DEPLOY TODO (Phase 2C Sub-session 2 ship):
// End-to-end email roundtrip (forgot → email click → /auth/callback → /reset)
// was NOT browser-verified before this shipped because Supabase's built-in
// email provider rate-limited us during debugging. Code-side verified via
// server log (redirectTo correctly resolves to current origin) and dashboard
// config confirmed (wildcard allowlist). When emails are flowing again,
// trigger one fresh reset against production and walk the link through to a
// successful password update. If it fails, the diagnostic trail is in this
// action's `console.log` output + the Supabase Auth logs.

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type ForgotPasswordState = {
  submitted?: boolean
  // We intentionally don't expose an "email not found" error — show the same
  // generic confirmation regardless (email enumeration protection).
  // formError is reserved for genuinely unexpected failures (network, etc.).
  formError?: string
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    // Same generic state — don't even tell the user they forgot to type.
    // Client-side validation will catch this case before submit.
    return { submitted: true }
  }

  // Build the absolute callback URL from request headers. The callback handles
  // the PKCE code exchange and forwards to /reset-password with a live session.
  //
  // Prefer the `origin` request header — browsers always set it on POST
  // submissions (Server Action invocations are POSTs from <form>), and it
  // carries the exact scheme+host the user's browser hit. This is the
  // canonical source for "where the user is right now," correctly distinguishing
  // localhost dev from preview deployments from production.
  //
  // Fall back to host + x-forwarded-proto only if `origin` is unset (rare —
  // would mean the action was invoked by a non-browser client).
  const h = await headers()
  const originHeader = h.get('origin')
  const origin =
    originHeader ??
    `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`
  const redirectTo = `${origin}/auth/callback?next=/reset-password`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    // Log server-side but never surface "user not found" to the form.
    console.error('[forgot-password] resetPasswordForEmail error:', error.message)
  } else {
    // Helpful trace so the dev console shows which redirect URL Supabase was
    // asked to use. If the email link still routes somewhere unexpected, the
    // mismatch is then on Supabase's Redirect URL allowlist, not in our code.
    console.log('[forgot-password] redirectTo sent to Supabase:', redirectTo)
  }

  return { submitted: true }
}
