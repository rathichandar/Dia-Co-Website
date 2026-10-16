// ============================================================
// Shipping & timing helpers
//
// Ship date is a ROLLING ESTIMATE from today's date.
// The clock doesn't really start until the customer approves
// (production begins on approval, not on submission).
// So the "expected ship" is honest as: "if you approve today,
// here's when it ships."
//
// Production stage breakdown adapts to finishPoint + rush flag.
// ============================================================

import type { FinishPoint } from "@/types/order"

interface ShipWindow {
  minDays: number
  maxDays: number
}

const STANDARD_SHIP_WINDOWS: Record<FinishPoint, ShipWindow> = {
  file: { minDays: 1, maxDays: 2 },
  wax: { minDays: 2, maxDays: 4 },
  raw_casting: { minDays: 3, maxDays: 5 },
  polished_mounting: { minDays: 6, maxDays: 8 },
  finished_piece: { minDays: 10, maxDays: 12 },
}

const RUSH_SHIP_WINDOWS: Record<FinishPoint, ShipWindow> = {
  file: { minDays: 1, maxDays: 1 },
  wax: { minDays: 1, maxDays: 3 },
  raw_casting: { minDays: 2, maxDays: 4 },
  polished_mounting: { minDays: 4, maxDays: 6 },
  finished_piece: { minDays: 6, maxDays: 8 },
}

export function getShipWindow(
  finishPoint: FinishPoint,
  isRush: boolean
): ShipWindow {
  return isRush
    ? RUSH_SHIP_WINDOWS[finishPoint]
    : STANDARD_SHIP_WINDOWS[finishPoint]
}

// ─── Production steps ──────────────────────────────────────

export interface ProductionStep {
  label: string
  durationDays: { min: number; max: number }
}

const STEP_DURATIONS: Record<string, { min: number; max: number }> = {
  printing: { min: 1, max: 1 },
  casting: { min: 1, max: 1 },
  cleaning: { min: 2, max: 3 },
  setting: { min: 2, max: 3 },
  polishing: { min: 1, max: 2 },
  qc: { min: 1, max: 2 },
}

const STEP_LABELS: Record<string, string> = {
  printing: "Printing",
  casting: "Casting",
  cleaning: "Cleaning & Pre-polish",
  setting: "Stone Setting",
  polishing: "Final Polish & Finishing",
  qc: "Final QC & Photography",
}

const STEPS_BY_FINISH_POINT: Record<FinishPoint, string[]> = {
  file: ["qc"],
  wax: ["printing", "qc"],
  raw_casting: ["printing", "casting", "qc"],
  polished_mounting: ["printing", "casting", "cleaning", "qc"],
  finished_piece: [
    "printing",
    "casting",
    "cleaning",
    "setting",
    "polishing",
    "qc",
  ],
}

export function getProductionSteps(
  finishPoint: FinishPoint,
  isRush: boolean
): ProductionStep[] {
  const stepKeys = STEPS_BY_FINISH_POINT[finishPoint]
  const rushFactor = isRush ? 0.6 : 1.0

  return stepKeys.map((key) => {
    const base = STEP_DURATIONS[key]
    return {
      label: STEP_LABELS[key],
      durationDays: {
        min: Math.max(1, Math.round(base.min * rushFactor)),
        max: Math.max(1, Math.round(base.max * rushFactor)),
      },
    }
  })
}

// ─── Date math ─────────────────────────────────────────────

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }
  return result
}

// Ship date range — ROLLING from today (not from any past date).
// `fromDate` defaults to now. Caller can override for testing.
export function computeShipDateRange(
  finishPoint: FinishPoint,
  isRush: boolean,
  fromDate: Date = new Date()
): { start: Date; end: Date } {
  const window = getShipWindow(finishPoint, isRush)
  return {
    start: addBusinessDays(fromDate, window.minDays),
    end: addBusinessDays(fromDate, window.maxDays),
  }
}

// ─── Formatters ─────────────────────────────────────────────

export function formatDateRange(range: { start: Date; end: Date }): string {
  const startStr = range.start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  const endStr = range.end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  return `${startStr} – ${endStr}`
}

export function formatStepDuration(step: ProductionStep): string {
  if (step.durationDays.min === step.durationDays.max) {
    const d = step.durationDays.min
    return `~${d} day${d === 1 ? "" : "s"}`
  }
  return `~${step.durationDays.min}–${step.durationDays.max} days`
}
