import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'
import { sanitizeRedirectTo } from '@/lib/auth/redirect'
import '../diaco-design.css'

export const metadata: Metadata = {
  title: 'Log in · Dia-Co',
}

interface LoginPageProps {
  searchParams: Promise<{
    redirectTo?: string
    reset?: string
    error?: string
  }>
}

// SS5: known error tokens set by /reset-password action after finalizeInvite.
// Unknown tokens are silently ignored (safe default — don't reflect arbitrary
// strings from query params).
const ERROR_MESSAGES: Record<string, string> = {
  invite_expired:
    'Your invitation has expired. Ask your Customer Admin to send a new one.',
  invite_revoked:
    'Your invitation was revoked. Contact your Customer Admin.',
  finalize_failed:
    'Something went wrong finalizing your invitation. Please contact support.',
  // Set by /auth/confirm when an emailed invite/reset token fails to verify.
  link_invalid:
    'That link is invalid or has expired. Ask for a new invitation or reset link.',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const redirectTo = sanitizeRedirectTo(params.redirectTo)
  const showResetSuccess = params.reset === '1'
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined

  return (
    <div className="diaco-design auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">Dia-Co Portal</h1>
        <p className="auth-subheading">Log in to your account</p>

        {showResetSuccess && (
          <div className="auth-banner auth-banner--success">
            Password updated. Log in with your new password.
          </div>
        )}

        {errorMessage && (
          <div className="auth-banner auth-banner--error">
            {errorMessage}
          </div>
        )}

        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  )
}
