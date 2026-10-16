'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction, type ForgotPasswordState } from './actions'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    ForgotPasswordState,
    FormData
  >(forgotPasswordAction, {})
  const [clientError, setClientError] = useState<string | undefined>(undefined)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget
    const email = String(new FormData(form).get('email') ?? '').trim()

    if (!email) {
      event.preventDefault()
      setClientError('Email is required')
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      event.preventDefault()
      setClientError('Enter a valid email')
      return
    }
    setClientError(undefined)
  }

  // After a submit (success or not), show the generic confirmation message.
  // Same copy regardless of whether the address is registered.
  if (state.submitted) {
    return (
      <div className="auth-confirmation">
        <p className="auth-confirmation-body">
          If an account with that email exists, we&apos;ve sent a password reset link.
          Check your inbox.
        </p>
        <Link href="/login" className="auth-link">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="auth-form" noValidate>
      <div className="auth-field">
        <label htmlFor="email" className="auth-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="auth-input"
          aria-invalid={clientError ? true : undefined}
        />
        {clientError && <div className="auth-field-error">{clientError}</div>}
      </div>

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? 'Sending…' : 'Send reset link'}
      </button>

      <div className="auth-secondary">
        <Link href="/login" className="auth-link">
          Back to login
        </Link>
      </div>
    </form>
  )
}
