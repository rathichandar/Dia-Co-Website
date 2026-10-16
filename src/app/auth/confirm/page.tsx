import type { Metadata } from 'next'
import Link from 'next/link'
import { confirmEmailLinkAction } from './actions'
import '../../diaco-design.css'

export const metadata: Metadata = {
  title: 'Continue · Dia-Co',
}

interface ConfirmPageProps {
  searchParams: Promise<{
    token_hash?: string
    type?: string
    next?: string
  }>
}

// Landing page for server-sent email links (invites; dashboard-sent resets).
// /auth/callback forwards ?token_hash=&type= here. Rendering this page spends
// nothing; the token is verified only when the Continue button POSTs, so a
// link scanner that fetches the URL cannot use up the invite.
export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams
  const tokenHash = params.token_hash ?? ''
  const type = params.type ?? ''
  const next = params.next ?? ''

  if (!tokenHash || (type !== 'invite' && type !== 'recovery')) {
    return (
      <div className="diaco-design auth-page">
        <div className="auth-card">
          <h1 className="auth-heading">Link invalid</h1>
          <p className="auth-subheading">
            This link is invalid or incomplete.
          </p>
          <div className="auth-secondary">
            <Link href="/login" className="auth-link">
              Go to login →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isInvite = type === 'invite'

  return (
    <div className="diaco-design auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">
          {isInvite ? 'Welcome to Dia-Co Portal' : 'Reset your password'}
        </h1>
        <p className="auth-subheading">
          {isInvite
            ? 'Continue to set your password and finish setting up your account.'
            : 'Continue to choose a new password.'}
        </p>
        <form action={confirmEmailLinkAction} className="auth-form">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="auth-submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
