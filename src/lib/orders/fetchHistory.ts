// ============================================================
// fetchHistory — shipped orders, bucketed by month, filterable by year.
//
// Eligibility: actual_ship_date IS NOT NULL AND actual_ship_date < today - 7 days
// The 7-day grace window keeps recently-shipped orders on the Active tab so
// customers can track delivery before they get archived here.
// ============================================================

import { createClient } from '@/lib/supabase/server'

export type YearFilter = number | 'earlier'

export interface HistoryItem {
  orderId: string
  orderNumber: string
  styleNumber: string | null
  endCustomerName: string | null
  clientPo: string | null
  repName: string | null
  amName: string | null
  actualShipDate: Date
  totalPrice: number | null
  heroImageUrl: string | null
}

export interface MonthGroup {
  year: number
  month: number // 1-12
  monthLabel: string // "April 2026"
  count: number
  totalBilled: number
  items: HistoryItem[]
}

export interface YearCount {
  label: string
  value: YearFilter
  count: number
}

export interface HistoryResult {
  monthGroups: MonthGroup[]
  yearCounts: YearCount[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function fetchHistory(filters: {
  year: YearFilter
}): Promise<HistoryResult> {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffIso = fmtDate(cutoff)

  const currentYear = today.getFullYear()
  const earlierCutoff = `${currentYear - 2}-01-01`

  // ─── Year-count query: ALL eligible ship dates, no other data ─────────
  const countsQ = await supabase
    .from('orders')
    .select('actual_ship_date')
    .not('actual_ship_date', 'is', null)
    .lt('actual_ship_date', cutoffIso)

  if (countsQ.error) {
    console.error('fetchHistory counts error:', countsQ.error.message)
    return { monthGroups: [], yearCounts: defaultYearCounts(currentYear) }
  }

  // Bucket ship-date years into currentYear / -1 / -2 / earlier.
  const buckets = new Map<number | 'earlier', number>()
  buckets.set(currentYear, 0)
  buckets.set(currentYear - 1, 0)
  buckets.set(currentYear - 2, 0)
  buckets.set('earlier', 0)
  for (const row of (countsQ.data ?? []) as Array<{ actual_ship_date: string }>) {
    const y = new Date(row.actual_ship_date + 'T00:00:00Z').getUTCFullYear()
    const key: number | 'earlier' = y < currentYear - 2 ? 'earlier' : y
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  const yearCounts: YearCount[] = [
    { label: String(currentYear), value: currentYear, count: buckets.get(currentYear) ?? 0 },
    { label: String(currentYear - 1), value: currentYear - 1, count: buckets.get(currentYear - 1) ?? 0 },
    { label: String(currentYear - 2), value: currentYear - 2, count: buckets.get(currentYear - 2) ?? 0 },
    { label: 'Earlier', value: 'earlier' as const, count: buckets.get('earlier') ?? 0 },
  ]
    // Current year always shows even when empty. Others must have count > 0.
    .filter((yc) => yc.value === currentYear || yc.count > 0)

  // ─── List query: full data for the selected year ──────────────────────
  let listQ = supabase
    .from('orders')
    .select(
      `
      id, order_number, style_number, end_customer_name, client_po,
      actual_ship_date,
      customer:customers!customer_id (assigned_am_id),
      submitter:users!submitted_by_user_id (full_name),
      am:users!assigned_am_id (full_name),
      cad_versions (
        id, version_number,
        cad_version_renders (image_url, display_order, image_role),
        cad_version_quote_lines (line_total_cents)
      )
      `,
    )
    .not('actual_ship_date', 'is', null)
    .lt('actual_ship_date', cutoffIso)
    .order('actual_ship_date', { ascending: false })

  if (filters.year === 'earlier') {
    listQ = listQ.lt('actual_ship_date', earlierCutoff)
  } else {
    const y = filters.year
    listQ = listQ
      .gte('actual_ship_date', `${y}-01-01`)
      .lt('actual_ship_date', `${y + 1}-01-01`)
  }

  const { data: rows, error: listErr } = await listQ
  if (listErr) {
    console.error('fetchHistory list error:', listErr.message)
    return { monthGroups: [], yearCounts }
  }

  // ─── Map rows → HistoryItem ──────────────────────────────────────────
  const items: HistoryItem[] = (rows ?? []).map((o: any): HistoryItem => {
    const versions = [...(o.cad_versions ?? [])].sort(
      (a: any, b: any) => a.version_number - b.version_number,
    )
    const latest = versions[versions.length - 1] ?? null

    let heroImageUrl: string | null = null
    if (latest) {
      const renders = [...(latest.cad_version_renders ?? [])].sort(
        (a: any, b: any) => a.display_order - b.display_order,
      )
      const hero = renders.find((r: any) => r.image_role === 'hero') ?? renders[0]
      heroImageUrl = hero?.image_url ?? null
    }

    let totalPrice: number | null = null
    if (latest) {
      const lines = latest.cad_version_quote_lines ?? []
      if (lines.length > 0) {
        const sum = lines.reduce(
          (s: number, l: any) => s + (l.line_total_cents ?? 0),
          0,
        )
        totalPrice = sum / 100
      }
    }

    return {
      orderId: o.id,
      orderNumber: o.order_number,
      styleNumber: o.style_number ?? null,
      endCustomerName: o.end_customer_name ?? null,
      clientPo: o.client_po ?? null,
      repName: o.submitter?.full_name ?? null,
      amName: o.am?.full_name ?? null,
      actualShipDate: new Date(o.actual_ship_date + 'T00:00:00Z'),
      totalPrice,
      heroImageUrl,
    }
  })

  // ─── Bucket by year-month, sort most-recent month first ──────────────
  const monthMap = new Map<string, MonthGroup>()
  for (const item of items) {
    const y = item.actualShipDate.getUTCFullYear()
    const m = item.actualShipDate.getUTCMonth() + 1
    const key = `${y}-${m}`
    let group = monthMap.get(key)
    if (!group) {
      group = {
        year: y,
        month: m,
        monthLabel: `${MONTHS[m - 1]} ${y}`,
        count: 0,
        totalBilled: 0,
        items: [],
      }
      monthMap.set(key, group)
    }
    group.items.push(item)
    group.count += 1
    group.totalBilled += item.totalPrice ?? 0
  }

  const monthGroups = Array.from(monthMap.values()).sort(
    (a, b) => b.year - a.year || b.month - a.month,
  )

  return { monthGroups, yearCounts }
}

function defaultYearCounts(currentYear: number): YearCount[] {
  return [{ label: String(currentYear), value: currentYear, count: 0 }]
}
