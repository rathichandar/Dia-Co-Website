// ============================================================
// relativeTime — Date → human-readable string helpers.
//
// Two formatters with different verbal registers:
//
//   relativeTime(d)
//     Short, terse. Used by the autosave indicator on /orders/new
//     ("just now", "30s ago", "5m ago"). Past an hour, falls back
//     to a same-day clock time ("3:45 PM"). Designed for an
//     always-visible UI element that needs to update in place
//     without flicker.
//
//   relativeTimeLong(d)
//     Conversational. Used by the Drafts table on /orders to show
//     when a draft was last edited ("2 hours ago", "Yesterday",
//     "May 22"). Designed for scan-readability — the customer is
//     deciding which draft to resume, not watching a tick.
//
// Extracted from NewOrderForm.tsx during Step 7 so the Drafts
// table can reuse the autosave-style formatter and add the
// longer-form sibling without drift.
// ============================================================

// Original autosave formatter — verbatim from NewOrderForm.tsx.
export function relativeTime(d: Date | null): string {
  if (!d) return "Not yet saved"
  const ms = Date.now() - d.getTime()
  if (ms < 5000) return "just now"
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

// Drafts-table formatter. Returns:
//   "just now"             (< 1 minute)
//   "N minutes ago"        (< 1 hour)
//   "N hours ago"          (< 24 hours, same calendar day)
//   "Yesterday"            (1 calendar day ago)
//   "N days ago"           (2–6 calendar days ago)
//   "Mon DD"               (≥ 7 days ago, same year)
//   "Mon DD, YYYY"         (different year)
//
// Calendar-day comparisons use local midnight boundaries so "5 hours
// ago" at 1 AM still reads as "Yesterday" if the edit was at 10 PM
// the prior calendar day — matches how customers actually think
// about "yesterday" vs "earlier today."
export function relativeTimeLong(d: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()

  if (diffMs < 60_000) return "just now"
  if (diffMs < 3_600_000) {
    const m = Math.floor(diffMs / 60_000)
    return m === 1 ? "1 minute ago" : `${m} minutes ago`
  }

  // Calendar-day diff: drop time-of-day, compare local midnights.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const then = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayDiff = Math.floor(
    (today.getTime() - then.getTime()) / (24 * 3600 * 1000),
  )

  if (dayDiff === 0) {
    const h = Math.floor(diffMs / 3_600_000)
    return h === 1 ? "1 hour ago" : `${h} hours ago`
  }
  if (dayDiff === 1) return "Yesterday"
  if (dayDiff < 7) return `${dayDiff} days ago`

  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}
