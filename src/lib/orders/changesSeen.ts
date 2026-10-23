// ============================================================
// Which of Dia-Co's changes this browser has already shown (2026-10-23).
//
// A change reads "New" when it was made after the last change the order's page showed in this browser. The mark is
// the ERP's own time of the latest change shown (not this computer's clock, so a clock set wrong can't hide one),
// kept in localStorage under diaco.changesSeen.<order no>. Nothing is stored in a database: another browser or
// device shows the same changes as new once.
// Storage can be missing or refuse (a private window, blocked site data): every read and write is guarded, and the
// page renders the same without it.
// ============================================================

import { useState, useSyncExternalStore } from "react"

const key = (orderNo: string) => `diaco.changesSeen.${orderNo}`

export function readChangesSeen(orderNo: string): string | null {
  try {
    return window.localStorage.getItem(key(orderNo))
  } catch {
    return null
  }
}

// Records `at` as shown, never moving the mark back.
export function writeChangesSeen(orderNo: string, at: string): void {
  try {
    const before = window.localStorage.getItem(key(orderNo))
    if (before && Date.parse(before) >= Date.parse(at)) return
    window.localStorage.setItem(key(orderNo), at)
  } catch {
    // storage unavailable: the changes simply read as new again next time
  }
}

const noSubscription = () => () => {}

// The mark as it stood when this component mounted -- read once, before this visit records its own -- so a change
// keeps reading "New" for the whole visit on which it first appears. undefined on the server and while hydrating
// (the server cannot know), then the browser's value: null when this browser never showed the order's changes.
export function useChangesSeenBefore(orderNo: string): string | null | undefined {
  const [before] = useState(() => (typeof window === "undefined" ? undefined : readChangesSeen(orderNo)))
  return useSyncExternalStore(
    noSubscription,
    () => before,
    () => undefined,
  )
}
