"use client"

import { useState, useTransition } from "react"
import { UserCheck, UserX } from "lucide-react"
import { setTeamMemberActive } from "@/lib/team/setTeamMemberActive"

// Same code→message map style as FlagToggle. Reactivation vs deactivation
// share the surface — the DB action is the same, only the boolean flips.
const ERROR_MESSAGES: Record<string, string> = {
  cannot_target_self: "You can't change your own status",
  target_not_found: "Team member no longer exists",
  forbidden: "You don't have permission",
  unauthenticated: "Session expired — please log in",
  invalid_input: "Invalid change",
  database_error: "Something went wrong — try again",
}

interface DeactivateButtonProps {
  userId: string
  memberName: string
  isDeactivated: boolean
  disabled?: boolean
}

export function DeactivateButton({
  userId,
  memberName,
  isDeactivated,
  disabled,
}: DeactivateButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (disabled || isPending) return
    const confirmMsg = isDeactivated
      ? `Reactivate ${memberName}? They'll regain portal access.`
      : `Deactivate ${memberName}? They'll lose portal access on their next login.`
    const confirmed = window.confirm(confirmMsg)
    if (!confirmed) return
    setError(null)
    startTransition(async () => {
      const result = await setTeamMemberActive(userId, isDeactivated)
      if (!result.ok) {
        const msg = ERROR_MESSAGES[result.code] ?? result.message
        setError(msg)
        setTimeout(() => setError(null), 3000)
        return
      }
      // setTeamMemberActive already calls revalidatePath('/team') server-side,
      // which re-renders this row's parent list. No client-side refresh
      // needed here.
    })
  }

  const label = isDeactivated ? "Reactivate" : "Deactivate"
  const Icon = isDeactivated ? UserCheck : UserX
  const btnClass = isDeactivated
    ? "team-btn team-btn--reactivate"
    : "team-btn team-btn--danger"

  return (
    <div className="team-deactivate">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        className={btnClass}
      >
        <Icon size={14} /> {label}
      </button>
      {error && (
        <span className="team-inline-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
