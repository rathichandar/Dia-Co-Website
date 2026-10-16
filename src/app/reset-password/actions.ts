'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { finalizeInvite } from '@/lib/team/finalizeInvite'

export type ResetPasswordState = {
  error?: string
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirm_password') ?? '')

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const supabase = await createClient()

  // Defense in depth: also confirm we have a session. The page already checks,
  // but if the user backgrounded the tab and the recovery session expired
  // between page load and submit, updateUser would fail anyway.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your reset session has expired. Request a new link.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return { error: error.message || 'Could not update password' }
  }

  // SS5: call finalizeInvite to check if this session belongs to an outstanding
  // pending invite. For regular password resets it's a no-op (returns
  // action:'none'), preserving SS2's signOut + redirect to /login. For invite
  // acceptors, it provisions user_profiles + public.users rows and keeps
  // the session alive so we can redirect straight into /orders.
  const finalizeResult = await finalizeInvite()

  switch (finalizeResult.action) {
    case 'none':
      // Regular password reset — preserved SS2 behavior. Sign out so the
      // user re-enters via /login with the new credentials, avoiding a
      // half-state where the recovery session lingers.
      await supabase.auth.signOut()
      redirect('/login?reset=1')

    case 'accepted':
    case 'already_accepted':
      // Invite finalized (or was already accepted). Session is intact and
      // fully provisioned; redirect straight to /orders.
      redirect('/orders')

    case 'expired':
      // finalizeInvite already signed out + deleted the orphan auth user.
      redirect('/login?error=invite_expired')

    case 'revoked':
      // finalizeInvite already signed out. (revoke_pending_invite deleted
      // the auth user earlier when the CA revoked.)
      redirect('/login?error=invite_revoked')

    case 'error':
      // finalizeInvite already signed out; message token is sanitized.
      redirect('/login?error=finalize_failed')

    default: {
      // Defensive: unknown action from finalizeInvite. Should be unreachable
      // — the discriminated union covers all 5 cases exhaustively — but if
      // finalizeInvite evolves and adds a case, this catches the drift.
      console.error(
        '[resetPasswordAction] unknown finalize action:',
        finalizeResult,
      )
      redirect('/login?error=finalize_failed')
    }
  }
}
