'use client'

import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Wraps a standard password <input> with a show/hide toggle on the right.
// The button only flips the input's `type` attribute — the underlying form
// field name and value are unchanged, so FormData / autofill / a11y tooling
// all keep working.
//
// Toggle is tabIndex=-1 to keep the natural tab order (email → password →
// submit). Mouse users still get the click target. Common UX pattern in
// consumer products like Google, Stripe.

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="auth-password-wrap">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className="auth-input"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="auth-password-toggle"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
