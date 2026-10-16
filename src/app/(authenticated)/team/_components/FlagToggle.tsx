"use client"

// Individual capability-flag toggle for a team member. Instant-update UI
// via local useState (checked state flips synchronously on click, then the
// Server Action fires inside a transition). On error the value reverts and
// an inline error surfaces for 2.5s.
//
// Note on state primitive: the spec called for useOptimistic, but React 19's
// useOptimistic reverts the optimistic value once the async transition
// completes UNLESS the underlying base state also updated by that time.
// With revalidatePath disabled by design (per the SS5 spec — optimistic UI
// is source of truth), the base state never refreshes, so useOptimistic
// would visually flash back to the old value on every successful click.
// useState + startTransition achieves the spec intent (instant UI, keep on
// success, revert on error) cleanly. Documented deviation.

import { useState, useTransition } from "react"
import {
  updateTeamMemberFlags,
  type CapabilityFlag,
} from "@/lib/team/updateTeamMemberFlags"

// Server-Action error codes → short user-facing strings for inline display.
const ERROR_MESSAGES: Record<string, string> = {
  cannot_target_self: "You can't change your own permissions",
  target_not_found: "Team member no longer exists",
  forbidden: "You don't have permission",
  unauthenticated: "Session expired — please log in",
  invalid_input: "Invalid change",
  database_error: "Something went wrong — try again",
}

interface FlagToggleProps {
  userId: string
  flag: CapabilityFlag
  label: string
  currentValue: boolean
  disabled?: boolean
}

export function FlagToggle({
  userId,
  flag,
  label,
  currentValue,
  disabled,
}: FlagToggleProps) {
  const [value, setValue] = useState(currentValue)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange() {
    if (disabled || isPending) return
    const newValue = !value
    setValue(newValue) // instant flip
    setError(null)
    startTransition(async () => {
      const result = await updateTeamMemberFlags(userId, { [flag]: newValue })
      if (!result.ok) {
        setValue(!newValue) // revert
        const msg = ERROR_MESSAGES[result.code] ?? result.message
        setError(msg)
        setTimeout(() => setError(null), 2500)
        return
      }
      // Success: keep the local value. No revalidation by design.
      // Reconcile with the server's returned value for the specific flag —
      // handles the edge case where server state differs from our optimistic
      // assumption (concurrent edit, etc.).
      setValue(result.data[flag] as boolean)
    })
  }

  return (
    <label
      className={`team-flag-toggle ${disabled ? "team-flag-toggle--disabled" : ""}`}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={handleChange}
        disabled={disabled || isPending}
      />
      <span className="team-flag-toggle__label">{label}</span>
      {error && (
        <span className="team-flag-toggle__error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}
