'use client'

import { useActionState, useState } from 'react'
import { resetPasswordAction, type ResetPasswordState } from './actions'
import { PasswordInput } from '@/components/PasswordInput'

type ClientErrors = {
  password?: string
  confirm?: string
}

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<
    ResetPasswordState,
    FormData
  >(resetPasswordAction, {})
  const [clientErrors, setClientErrors] = useState<ClientErrors>({})

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget
    const data = new FormData(form)
    const password = String(data.get('password') ?? '')
    const confirm = String(data.get('confirm_password') ?? '')

    const errors: ClientErrors = {}
    if (password.length < 8) errors.password = 'At least 8 characters'
    if (password !== confirm) errors.confirm = 'Passwords do not match'

    if (Object.keys(errors).length > 0) {
      event.preventDefault()
      setClientErrors(errors)
      return
    }
    setClientErrors({})
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="auth-form" noValidate>
      <div className="auth-field">
        <label htmlFor="password" className="auth-label">
          New password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={clientErrors.password ? true : undefined}
        />
        {clientErrors.password && (
          <div className="auth-field-error">{clientErrors.password}</div>
        )}
      </div>

      <div className="auth-field">
        <label htmlFor="confirm_password" className="auth-label">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm_password"
          name="confirm_password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={clientErrors.confirm ? true : undefined}
        />
        {clientErrors.confirm && (
          <div className="auth-field-error">{clientErrors.confirm}</div>
        )}
      </div>

      {state.error && <div className="auth-form-error">{state.error}</div>}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
