"use client"

// ============================================================
// ModifyDialog
// Phase 1: simple textarea-based modification request.
// Customer describes what they want changed in writing.
//
// Phase 2: the rich form (visual field edits for size, qty,
// metal, stones, accents, finish point) will share logic with
// the order submission flow — once that's built, this dialog
// will reuse it pre-filled with current order values.
// ============================================================

import { useState } from "react"
import { Dialog } from "./Dialog"
import type { Order } from "@/types/order"

interface ModifyDialogProps {
  open: boolean
  onClose: () => void
  order: Order
}

export function ModifyDialog({ open, onClose, order }: ModifyDialogProps) {
  const [note, setNote] = useState("")

  function handleSubmit() {
    if (!note.trim()) {
      alert("Please describe what you'd like changed.")
      return
    }
    alert(
      `Modification request placeholder — would route to Priya Anand for review.\n\nYour message:\n${note}`
    )
    setNote("")
    onClose()
  }

  function handleClose() {
    setNote("")
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Request modification"
      maxWidth="max-w-xl"
    >
      <p className="text-sm text-neutral-700 leading-relaxed mb-5">
        Describe what you&apos;d like changed on PO-{order.poNumber}. Your AM
        will review and follow up with a new CAD or any clarifying questions.
      </p>

      <div className="mb-4">
        <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
          What needs to change?
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={6}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 resize-none"
          placeholder="e.g., Change the metal from 14k yellow to 18k white, bump the center to 5.0ct, swap the sapphire accents for emerald, and add a size 7 in addition to the 6.5..."
        />
        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
          You can request changes to anything: size, quantity, metal (single or
          multi-tone), stones (type, supply, quality), accents, finish point,
          engraving, or shipping. Your AM will confirm what&apos;s feasible and
          how it affects the quote.
        </p>
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed mb-5 italic">
        Coming soon: visual editing of these fields directly. For now, please
        describe your changes in writing.
      </p>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded"
        >
          Send modification request
        </button>
      </div>
    </Dialog>
  )
}
