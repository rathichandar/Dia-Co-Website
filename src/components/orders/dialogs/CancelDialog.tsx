"use client"

// ============================================================
// CancelDialog
// Simple confirmation for cancelling an order.
// On confirm: stub alert.
// ============================================================

import { Dialog } from "./Dialog"
import type { Order } from "@/types/order"

interface CancelDialogProps {
  open: boolean
  onClose: () => void
  order: Order
}

export function CancelDialog({ open, onClose, order }: CancelDialogProps) {
  function handleConfirm() {
    alert(
      `Cancellation placeholder — would mark ${order.poNumber} cancelled and notify your AM.`
    )
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Cancel this order?">
      <p className="text-sm text-neutral-700 leading-relaxed mb-5">
        No fees have been charged. Cancelling closes the order and notifies your
        AM. This action can&apos;t be undone — you&apos;ll need to submit a new
        order if you change your mind.
      </p>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900"
        >
          Keep order
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
        >
          Cancel order
        </button>
      </div>
    </Dialog>
  )
}
