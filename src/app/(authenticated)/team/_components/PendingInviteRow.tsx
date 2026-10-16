"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, RefreshCw, X } from "lucide-react"
import { resendInvite } from "@/lib/team/resendInvite"
import { revokeInvite } from "@/lib/team/revokeInvite"
import type { PendingInvite } from "../page"

const ROLE_LABEL: Record<PendingInvite["role"], string> = {
  sales_rep: "Sales Rep",
  customer_admin: "Customer Admin",
}

// Format the expiry as "Expires in N days" (or hours if <1d). Gold warning
// icon if <2 days remaining. Matches §11 warning visual language.
function formatExpiry(expiresAt: string): { text: string; warn: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return { text: "Expired", warn: true }
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (days >= 1) {
    return {
      text: `Expires in ${days} day${days === 1 ? "" : "s"}`,
      warn: days < 2,
    }
  }
  return {
    text: `Expires in ${hours} hour${hours === 1 ? "" : "s"}`,
    warn: true,
  }
}

interface PendingInviteRowProps {
  invite: PendingInvite
}

export function PendingInviteRow({ invite }: PendingInviteRowProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [resentFlash, setResentFlash] = useState(false)
  const [isPending, startTransition] = useTransition()

  const fullName = `${invite.first_name} ${invite.last_name}`.trim()
  const expiry = formatExpiry(invite.expires_at)

  function handleResend() {
    if (isPending) return
    setError(null)
    startTransition(async () => {
      const result = await resendInvite(invite.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setResentFlash(true)
      router.refresh()
      setTimeout(() => setResentFlash(false), 2500)
    })
  }

  function handleRevoke() {
    if (isPending) return
    const confirmed = window.confirm(
      `Revoke invitation to ${invite.email}? They won't be able to accept the invite.`,
    )
    if (!confirmed) return
    setError(null)
    startTransition(async () => {
      const result = await revokeInvite(invite.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Row disappears on refresh (status='revoked' filters out of the list).
      router.refresh()
    })
  }

  return (
    <div className="team-pending-row">
      <div className="team-pending-row__meta">
        <div className="team-pending-row__name">{fullName}</div>
        <div className="team-pending-row__email">{invite.email}</div>
        <div className="team-pending-row__badges">
          <span className={`team-role-badge team-role-badge--${invite.role}`}>
            {ROLE_LABEL[invite.role]}
          </span>
          <span className="team-pending-row__expiry">
            {expiry.warn && (
              <AlertTriangle
                size={14}
                className="team-warn-icon"
                aria-label="Expiring soon"
              />
            )}
            <span className="team-pending-row__expiry-text">{expiry.text}</span>
          </span>
        </div>
        {error && (
          <div className="team-inline-error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="team-pending-row__actions">
        {resentFlash && (
          <span className="team-inline-flash" role="status">
            Resent
          </span>
        )}
        <button
          type="button"
          onClick={handleResend}
          disabled={isPending}
          className="team-btn team-btn--secondary"
        >
          <RefreshCw size={14} /> Resend
        </button>
        <button
          type="button"
          onClick={handleRevoke}
          disabled={isPending}
          className="team-btn team-btn--danger"
        >
          <X size={14} /> Revoke
        </button>
      </div>
    </div>
  )
}
