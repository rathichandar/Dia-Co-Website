// ============================================================
// StageRibbon
// 4-stage tracker (3 for file/wax orders): A Designing → B Production
// → C QC → D Shipping.
// Past stages: cream bg with checkmark. Current stage: black bg, gold letter.
// ============================================================

import type { Order, Stage } from "@/types/order"

interface StageRibbonProps {
  order: Order
}

interface RibbonStage {
  key: Stage
  label: string
  subLabel: string
}

export function StageRibbon({ order }: StageRibbonProps) {
  const stages = stagesForFinishPoint(order)
  const currentSubLabel = currentSubStateLabel(order)

  return (
    <nav
      className="stage-ribbon"
      style={{ ["--stage-cols" as string]: stages.length }}
    >
      {stages.map((stage, idx) => {
        const isActive = stage.key === order.currentStage
        const isComplete = isStageComplete(order, stage.key, stages)
        const cellClass = `ribbon-cell ${
          isActive ? "is-current" : isComplete ? "is-done" : ""
        }`
        return (
          <div key={stage.key} className={cellClass}>
            <div className="let">Stage {String.fromCharCode(65 + idx)}</div>
            <div className="ttl">{stage.label}</div>
            <div className="sub">
              {isActive && currentSubLabel ? currentSubLabel : stage.subLabel}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

// ─── Helpers ────────────────────────────────────────────────

function stagesForFinishPoint(order: Order): RibbonStage[] {
  const baseStages: RibbonStage[] = [
    { key: "designing", label: "Designing", subLabel: "CAD review" },
    {
      key: "production",
      label: "Production",
      subLabel: "Casting + setting",
    },
    { key: "qc", label: "QC", subLabel: "Inspection + video" },
    { key: "shipping", label: "Shipping", subLabel: "Insured, overnight" },
  ]

  if (order.finishPoint === "file" || order.finishPoint === "wax") {
    return [
      baseStages[0],
      {
        key: "production",
        label: "Wax production",
        subLabel: "Printing & QC",
      },
      baseStages[3],
    ]
  }

  return baseStages
}

function isStageComplete(
  order: Order,
  stageKey: Stage,
  stages: RibbonStage[]
): boolean {
  const currentIdx = stages.findIndex((s) => s.key === order.currentStage)
  const thisIdx = stages.findIndex((s) => s.key === stageKey)
  return thisIdx >= 0 && currentIdx > thisIdx
}

function currentSubStateLabel(order: Order): string | null {
  if (order.stageDetail.kind !== "designing") return null
  const v = order.stageDetail.currentCadVersion

  switch (order.stageDetail.subState) {
    case "awaiting_first_cad":
      return "First CAD coming"
    case "awaiting_customer_review":
      return `CAD ${v} · awaiting your review`
    case "awaiting_modifications":
      return "Working on your modifications"
    case "approved":
      return "Approved — moving to production"
    default:
      return null
  }
}
