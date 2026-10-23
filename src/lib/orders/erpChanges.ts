// ============================================================
// What Dia-Co changed of what the customer sent (ERP integration, 2026-10-23).
//
// An AM may change what a customer entered on a Portal order -- while creating the order in the ERP, or later -- and
// the customer sees each change on the Portal. The ERP's order JSON carries them as `changes` (oldest first, at most
// the 50 latest; absent from an older ERP) and the order's current specification in words as `details`. Both arrive
// in the Portal's words; nothing here recomputes a value, and the customer is never told who at Dia-Co changed it.
//
// Pure functions only (no React, no server code), shared by the order page, the orders list and
// scripts/check-erp-changes.ts.
// ============================================================

import type { ErpChange, ErpChangeField, ErpOrderDetails } from "@/types/order"

// The label for a field, when an ERP sends a change without its own `what`.
export const ERP_CHANGE_LABELS: Record<ErpChangeField, string> = {
  reference: "Your reference",
  end_customer: "End customer",
  quantity: "Quantity",
  product_type: "Product type",
  size: "Size",
  finish_point: "Finish point",
  metal: "Metal",
  center_stone: "Center stone",
  more_centers: "More center stones",
  accents: "Accents",
  engraving: "Engraving",
  description: "Your description",
  shipping: "Shipping",
}

const FIELDS = new Set(Object.keys(ERP_CHANGE_LABELS))

function words(x: unknown): string | null {
  if (typeof x !== "string") return null
  const s = x.trim()
  return s ? s : null
}

function time(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? NaN : t
}

// The ERP's `changes` as the Portal keeps them: oldest first; a row without a time or a label is left out.
export function readErpChanges(rows: unknown): ErpChange[] {
  if (!Array.isArray(rows)) return []
  const out: ErpChange[] = []
  for (const r of rows) {
    if (!r || typeof r !== "object") continue
    const row = r as Record<string, unknown>
    const at = words(row.at)
    if (!at || Number.isNaN(time(at))) continue
    const field = typeof row.field === "string" && FIELDS.has(row.field) ? (row.field as ErpChangeField) : null
    const what = words(row.what) ?? (field ? ERP_CHANGE_LABELS[field] : null)
    if (!what) continue
    out.push({
      field,
      what,
      was: words(row.was),
      now: words(row.now),
      note: words(row.note),
      at,
      atCreation: row.at_creation === true,
    })
  }
  // Oldest first, as the contract says; a stable sort keeps the ERP's own order for changes made together.
  return out.map((c, i) => ({ c, i })).sort((a, b) => time(a.c.at) - time(b.c.at) || a.i - b.i).map((x) => x.c)
}

// The ERP's `details`; undefined when it sent none (an older ERP).
export function readErpDetails(d: unknown): ErpOrderDetails | undefined {
  if (!d || typeof d !== "object" || Array.isArray(d)) return undefined
  const o = d as Record<string, unknown>
  const list = (x: unknown) => (Array.isArray(x) ? x.map(words).filter((s): s is string => s !== null) : [])
  return {
    metals: list(o.metals),
    centerStone: words(o.center_stone),
    moreCenters: list(o.more_centers),
    accents: words(o.accents),
    engraving: words(o.engraving),
  }
}

// ─── Days ───────────────────────────────────────────────────
// A change's day is the shop's (Pacific) day, as the ERP keeps its customer-facing days. Fixed, so the server's
// render and the browser's agree.

const PACIFIC = "America/Los_Angeles"
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: PACIFIC })
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: PACIFIC })

export function changeDay(at: string | Date): string {
  return DAY.format(typeof at === "string" ? new Date(at) : at)
}

function dayKey(at: string | Date): string {
  return DAY_KEY.format(typeof at === "string" ? new Date(at) : at)
}

// ─── The header strip and the list chip ─────────────────────

// "Size, Metal and Center stone": each label once, in the order they were changed.
export function changedLabels(changes: ErpChange[]): string[] {
  const seen: string[] = []
  for (const c of changes) if (!seen.includes(c.what)) seen.push(c.what)
  return seen
}

export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

// The sentence under the order's header: "Dia-Co changed 3 details" + " of what you sent: Size, Metal and Center stone."
export function changesStripText(changes: ErpChange[]): { lead: string; rest: string } {
  const labels = changedLabels(changes)
  return {
    lead: `Dia-Co changed ${labels.length} ${labels.length === 1 ? "detail" : "details"}`,
    rest: ` of what you sent: ${joinAnd(labels)}.`,
  }
}

// "3 changes by Dia-Co · 1 new"
export function changesChipText(count: number, fresh: number): string {
  return `${count} ${count === 1 ? "change" : "changes"} by Dia-Co${fresh > 0 ? ` · ${fresh} new` : ""}`
}

// ─── New ────────────────────────────────────────────────────
// A change is new when it was made after the last change this browser showed on the order's page.
//   seenBefore undefined: not known yet (the server's render) -- nothing reads as new;
//   seenBefore null: this browser never showed the order's changes -- every one is new.

export function isNewChange(at: string, seenBefore: string | null | undefined): boolean {
  if (seenBefore === undefined) return false
  const seen = seenBefore === null ? NaN : time(seenBefore)
  if (Number.isNaN(seen)) return true
  return time(at) > seen
}

export function countNew(times: string[], seenBefore: string | null | undefined): number {
  return times.filter((at) => isNewChange(at, seenBefore)).length
}

// The latest change's time: what the page records as shown.
export function latestChangeAt(changes: { at: string }[]): string | null {
  let best: string | null = null
  for (const c of changes) if (best === null || time(c.at) > time(best)) best = c.at
  return best
}

// ─── The card's groups ──────────────────────────────────────

export interface ChangeGroup {
  key: string
  heading: string
  changes: ErpChange[]
}

// Changes made while the order was created form one group; later ones a group per day. Newest group first; inside a
// group, the order the ERP sent them. A later day names the design sent that same day, when there was one.
export function groupChanges(changes: ErpChange[], designs: { label: string; at: Date }[] = []): ChangeGroup[] {
  const groups = new Map<string, { key: string; first: ErpChange; latest: number; creation: boolean; changes: ErpChange[] }>()
  for (const c of changes) {
    const key = c.atCreation ? "creation" : `day:${dayKey(c.at)}`
    let g = groups.get(key)
    if (!g) {
      g = { key, first: c, latest: -Infinity, creation: c.atCreation, changes: [] }
      groups.set(key, g)
    }
    g.changes.push(c)
    g.latest = Math.max(g.latest, time(c.at))
  }
  return [...groups.values()]
    .sort((a, b) => b.latest - a.latest || Number(a.creation) - Number(b.creation))
    .map((g) => {
      const day = changeDay(g.first.at)
      if (g.creation) return { key: g.key, heading: `${day} · when your order was created`, changes: g.changes }
      const k = dayKey(g.first.at)
      const design = designs.filter((d) => d.at.getTime() > 0 && dayKey(d.at) === k).pop()
      return { key: g.key, heading: design ? `${day} · with design ${design.label}` : day, changes: g.changes }
    })
}

// ─── One field's change, for the spec tiles and rows ────────

export interface FieldChange {
  // what the customer sent (null: they sent nothing there)
  was: string | null
  // when it last changed
  at: string
}

// A field changed once or more: what the customer first sent, and the latest change's time.
export function fieldChange(changes: ErpChange[], field: ErpChangeField): FieldChange | null {
  const mine = changes.filter((c) => c.field === field)
  if (!mine.length) return null
  return { was: mine[0].was, at: mine[mine.length - 1].at }
}

// The order's metals, each with what the customer sent when Dia-Co changed it. A change is matched to the metal it
// produced (its `now`), and followed back through earlier changes of that metal to what the customer sent. Changes
// that match no metal now (a metal removed, or worded differently) are `loose`.
export function metalLines(
  metals: string[],
  changes: ErpChange[],
): { lines: { text: string; change: FieldChange | null }[]; loose: FieldChange[] } {
  const mine = changes.filter((c) => c.field === "metal")
  const used = mine.map(() => false)
  const walkBack = (from: number): FieldChange => {
    used[from] = true
    let was = mine[from].was
    for (let j = from - 1; j >= 0 && was !== null; j--) {
      if (!used[j] && mine[j].now === was) {
        used[j] = true
        was = mine[j].was
      }
    }
    return { was, at: mine[from].at }
  }
  const lines = metals.map((text) => {
    for (let i = mine.length - 1; i >= 0; i--) if (!used[i] && mine[i].now === text) return { text, change: walkBack(i) }
    return { text, change: null }
  })
  const loose: FieldChange[] = []
  for (let i = mine.length - 1; i >= 0; i--) if (!used[i]) loose.push(walkBack(i))
  return { lines, loose }
}

// "2nd: Ruby · Pear · 0.5 ct"; "2nd and 3rd: Ruby · Pear · 0.5 ct each"; "2nd and 3rd: A; B".
export function moreCentersText(more: string[]): string | null {
  if (!more.length) return null
  if (more.length === 1) return `2nd: ${more[0]}`
  if (more.length === 2) return more[0] === more[1] ? `2nd and 3rd: ${more[0]} each` : `2nd and 3rd: ${more[0]}; ${more[1]}`
  return `More: ${more.join("; ")}`
}

// A spec in words as a tile shows it: the first two parts as the value ("Lab-grown · Oval"), the rest as its note.
export function tileParts(s: string | null): { v: string; n: string | null } {
  if (!s) return { v: "—", n: null }
  const parts = s.split(" · ")
  return { v: parts.slice(0, 2).join(" · "), n: parts.length > 2 ? parts.slice(2).join(" · ") : null }
}
