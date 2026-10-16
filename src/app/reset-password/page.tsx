import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from './ResetPasswordForm'
import '../diaco-design.css'

export const metadata: Metadata = {
  title: 'Reset password · Dia-Co',
}

// Users arrive here via the email link → /auth/callback (PKCE exchange) →
// /reset-password (this page). If the exchange succeeded, there's a live
// session in the cookies and getUser() returns a user — show the form.
// If they typed /reset-password directly with no session, show "invalid or
// expired" with a link back to /forgot-password.
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="diaco-design auth-page">
        <div className="auth-card">
          <h1 className="auth-heading">Reset link invalid</h1>
          <p className="auth-subheading">
            This reset link is invalid or has expired.
          </p>
          <div className="auth-secondary">
            <Link href="/forgot-password" className="auth-link">
              Request a new one →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="diaco-design auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">Set a new password</h1>
        <p className="auth-subheading">
          Choose a new password for {user.email}.
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
