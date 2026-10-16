'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sanitizeRedirectTo } from '@/lib/auth/redirect'

export type LoginState = {
  error?: string
}

// Server action for the login form. Called via useActionState on the client.
// On success, throws via redirect() — caller never sees the resolved value.
// On failure, returns a generic error message (deliberately not differentiating
// between "no such user" and "wrong password" — email enumeration protection).
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = sanitizeRedirectTo(
    String(formData.get('redirectTo') ?? ''),
  )

  if (!email || !password) {
    return { error: 'Invalid email or password' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Invalid email or password' }
  }

  // SS5: post-auth checks. Fetch the caller's user_profiles row to verify
  // (a) it exists (defensive against the SS4 Migration 18 lesson — auth.users
  // seeded without a corresponding user_profiles row), and (b) the account
  // isn't deactivated (SS5 team management feature).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Should be unreachable: signInWithPassword succeeded but session
    // didn't stick. Log + generic error (don't leak internal detail).
    console.error('[login] getUser returned null after successful signIn')
    await supabase.auth.signOut()
    return { error: 'Invalid email or password' }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('deactivated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    // Data-integrity gap: auth.users row exists but user_profiles does not.
    // Log with enough context to trace, return generic error (don't leak
    // account state).
    console.error('[login] user_profiles_missing', {
      userId: user.id,
      email: user.email,
    })
    await supabase.auth.signOut()
    return {
      error: 'Something went wrong signing in. Please contact support.',
    }
  }

  if (profile.deactivated_at) {
    // Account was deactivated by a Customer Admin (SS5 setTeamMemberActive).
    // Session was just created by signInWithPassword; tear it down.
    await supabase.auth.signOut()
    return {
      error:
        'This account has been deactivated. Contact your Customer Admin.',
    }
  }

  // Force Next.js to flush queued cookie writes before the redirect leaves
  // the action. Server Actions use Next's X-Action-Redirect protocol rather
  // than a standard HTTP 303 — on Vercel, supabase-ssr's session cookies
  // queued via cookieStore.set() during signInWithPassword can be dropped
  // through that flow if no cache revalidation happens first. Calling
  // revalidatePath with 'layout' scope is the documented workaround.
  // Locally (single dev process) this isn't needed; prod surfaces it.
  revalidatePath('/', 'layout')

  redirect(redirectTo)
}
