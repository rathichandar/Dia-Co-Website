import type { Metadata } from 'next'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import '../diaco-design.css'

export const metadata: Metadata = {
  title: 'Forgot password · Dia-Co',
}

export default function ForgotPasswordPage() {
  return (
    <div className="diaco-design auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">Forgot password</h1>
        <p className="auth-subheading">
          Enter the email on your account. We&apos;ll send a reset link if it
          matches one of our users.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
