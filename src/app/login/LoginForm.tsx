'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from './actions'
import { PasswordInput } from '@/components/PasswordInput'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ClientErrors = {
  email?: string
  password?: string
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  )
  const [clientErrors, setClientErrors] = useState<ClientErrors>({})

  // Client-side validation: runs in the form's onSubmit. Stops the submission
  // if email/password are missing or malformed. Server enforces too (defense
  // in depth) — this layer just avoids a round trip.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget
    const email = String(new FormData(form).get('email') ?? '').trim()
    const password = String(new FormData(form).get('password') ?? '')

    const errors: ClientErrors = {}
    if (!email) errors.email = 'Email is required'
    else if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email'
    if (!password) errors.password = 'Password is required'

    if (Object.keys(errors).length > 0) {
      event.preventDefault()
      setClientErrors(errors)
      return
    }

    setClientErrors({})
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="auth-form" noValidate>
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="auth-field">
        <label htmlFor="email" className="auth-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="auth-input"
          aria-invalid={clientErrors.email ? true : undefined}
        />
        {clientErrors.email && (
          <div className="auth-field-error">{clientErrors.email}</div>
        )}
      </div>

      <div className="auth-field">
        <label htmlFor="password" className="auth-label">
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={clientErrors.password ? true : undefined}
        />
        {clientErrors.password && (
          <div className="auth-field-error">{clientErrors.password}</div>
        )}
      </div>

      {state.error && <div className="auth-form-error">{state.error}</div>}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? 'Logging in…' : 'Log in'}
      </button>

      <div className="auth-secondary">
        <Link href="/forgot-password" className="auth-link">
          Forgot password?
        </Link>
      </div>
    </form>
  )
}
