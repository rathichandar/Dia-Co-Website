"use client"

// ============================================================
// CadLightbox
// Full-screen image viewer modal. Cycles through a version's
// renders. ESC and arrow keys nav. Backdrop click closes.
// ============================================================

import { useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { CadRender } from "@/types/order"

interface CadLightboxProps {
  renders: CadRender[]
  index: number
  onClose: () => void
  onIndexChange: (next: number) => void
}

export function CadLightbox({
  renders,
  index,
  onClose,
  onIndexChange,
}: CadLightboxProps) {
  const total = renders.length
  const active = renders[index]

  const goPrev = useCallback(() => {
    if (total === 0) return
    onIndexChange((index - 1 + total) % total)
  }, [index, total, onIndexChange])

  const goNext = useCallback(() => {
    if (total === 0) return
    onIndexChange((index + 1) % total)
  }, [index, total, onIndexChange])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        goPrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose, goPrev, goNext])

  if (!active) return null

  return (
    <div
      className="cad-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="CAD image viewer"
      onClick={onClose}
    >
      <button
        type="button"
        className="cad-lightbox__close"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close viewer"
      >
        <X size={20} />
      </button>

      {total > 1 && (
        <button
          type="button"
          className="cad-lightbox__nav cad-lightbox__nav--prev"
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
          aria-label="Previous image"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <div
        className="cad-lightbox__stage"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={active.imageUrl}
          alt={active.label}
          className="cad-lightbox__img"
        />
        <div className="cad-lightbox__caption">
          {active.label}
          {total > 1 && (
            <span className="cad-lightbox__count">
              {index + 1} / {total}
            </span>
          )}
        </div>
      </div>

      {total > 1 && (
        <button
          type="button"
          className="cad-lightbox__nav cad-lightbox__nav--next"
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
          aria-label="Next image"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  )
}
