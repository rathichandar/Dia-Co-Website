"use client"

// ============================================================
// ActionCard
// Right-rail action card — primary surface for "do something now."
// Brown 2px border + editorial layout.
// ============================================================

import { useState } from "react"
import { Check, GitBranch, X } from "lucide-react"
import type {
  Order,
  Customer,
  AccountManager,
  CadVersion,
} from "@/types/order"
import {
  getShipWindow,
  computeShipDateRange,
  formatDateRange,
} from "@/lib/shipping"
import { ApproveDialog } from "./dialogs/ApproveDialog"
import { ModifyDialog } from "./dialogs/ModifyDialog"
import { CancelDialog } from "./dialogs/CancelDialog"

interface ActionCardProps {
  order: Order
  customer: Customer
  am: AccountManager
  activeVersion: CadVersion
  isOnLatest: boolean
  latestVersionNumber: string
  isRushOn: boolean
  onRushChange: (next: boolean) => void
}

export function ActionCard({
  order,
  customer,
  am,
  activeVersion,
  isOnLatest,
  latestVersionNumber,
  isRushOn,
  onRushChange,
}: ActionCardProps) {
  const [approveOpen, setApproveOpen] = useState(false)
  const [modifyOpen, setModifyOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const cancelAllowed = isCancelAllowed(order)
  const cancelReason = cancelAllowed
    ? null
    : "Cancellation isn't available once the order has been approved."

  const shipWindow = getShipWindow(order.finishPoint, isRushOn)
  const computedShipDate = computeShipDateRange(order.finishPoint, isRushOn)

  const approveDisabled = !isOnLatest
  const approveDisabledReason = !isOnLatest
    ? `Past versions cannot be approved. Switch to CAD ${latestVersionNumber} to approve, or request a modification if you wish to revert to this design.`
    : null

  const baseTotal = activeVersion.quote.estimatedTotal
  const totalWithRush = baseTotal + (isRushOn ? order.priorityRush.fee : 0)

  return (
    <>
      <aside className="action-card">
        <div className="action-card__eyebrow">Action required</div>
        <h3 className="action-card__title">
          Approve CAD {activeVersion.versionNumber}?
        </h3>
        <p className="action-card__sub">
          {`Approving moves ${order.poNumber} to Stage B (Production). Quote locks at this point — modifications after this incur a re-cast fee.`}
        </p>

        <div className="action-card__quote">
          <div className="l">Total quoted</div>
          <div className="v">{formatCurrency(totalWithRush)}</div>
        </div>

        <div className="action-card__rows">
          <div className="row">
            <span>Quote validity</span>
            <strong>{activeVersion.quote.validity.validForDays} days</strong>
          </div>
          <div className="row">
            <span>If approved today, ships</span>
            <strong>{formatDateRange(computedShipDate)}</strong>
          </div>
          <div className="row">
            <span>Insurance</span>
            <strong>
              ${order.shipping.insuredAmount.toLocaleString("en-US")}
            </strong>
          </div>
        </div>

        {/* Priority Rush */}
        <div className="rush-block">
          <label className="rush-block__label">
            <input
              type="checkbox"
              checked={isRushOn}
              onChange={(e) => onRushChange(e.target.checked)}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rush-block__head">
                <span className="rush-block__name">Priority Rush</span>
                <span className="rush-block__fee">
                  +${order.priorityRush.fee}
                </span>
              </div>
              <p className="rush-block__sub">
                Subject to AM review. Uniquely complex pieces, jobs with heavy
                stone-setting, or assembly-heavy orders may not be eligible.
                Your AM will confirm within 1 business day.
              </p>
            </div>
          </label>

          <div className={`rush-block__ship ${isRushOn ? "is-rush" : ""}`}>
            <div className="k">If approved today</div>
            <div className="v">
              {formatDateRange(computedShipDate)}
              <span className="days">
                ({shipWindow.minDays}–{shipWindow.maxDays} business days)
              </span>
            </div>
          </div>
        </div>

        <div className="action-card__actions">
          <button
            type="button"
            className="btn"
            disabled={approveDisabled}
            title={approveDisabledReason || undefined}
            onClick={() => !approveDisabled && setApproveOpen(true)}
          >
            <Check size={14} /> Approve CAD {activeVersion.versionNumber}
          </button>
          {approveDisabled && approveDisabledReason && (
            <p className="action-card__disclaimer">{approveDisabledReason}</p>
          )}

          <button
            type="button"
            className="btn btn--sec"
            onClick={() => setModifyOpen(true)}
          >
            <GitBranch size={14} /> Request modification
          </button>

          <button
            type="button"
            className="btn btn--danger"
            disabled={!cancelAllowed}
            title={cancelReason || undefined}
            onClick={() => cancelAllowed && setCancelOpen(true)}
          >
            <X size={14} /> Cancel order
          </button>
          {!cancelAllowed && cancelReason && (
            <p className="action-card__note">{cancelReason}</p>
          )}
        </div>
      </aside>

      {/* Dialogs — unchanged */}
      <ApproveDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        order={order}
        customer={customer}
        activeVersion={activeVersion}
        isRushOn={isRushOn}
        computedShipDate={computedShipDate}
      />
      <ModifyDialog
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
        order={order}
      />
      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        order={order}
      />
    </>
  )
}

function isCancelAllowed(order: Order): boolean {
  if (order.currentStage === "draft") return true
  if (order.currentStage !== "designing") return false
  if (order.stageDetail.kind === "designing") {
    return order.stageDetail.subState !== "approved"
  }
  return false
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
