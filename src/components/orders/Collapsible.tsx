"use client"

// ============================================================
// Collapsible
// Reusable section that expands/collapses. New `.coll` look with
// rotating Lucide chevron-right.
// ============================================================

import { useState } from "react"
import { ChevronRight } from "lucide-react"

interface CollapsibleProps {
  title: string
  count?: string | number | null
  subtitle?: string | null
  defaultOpen?: boolean
  children: React.ReactNode
}

export function Collapsible({
  title,
  count,
  subtitle,
  defaultOpen = true,
  children,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={`coll ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="coll__head"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4>
          <span>{title}</span>
          {count != null && count !== "" && (
            <span className="count">· {count}</span>
          )}
          {subtitle && <span className="count">· {subtitle}</span>}
        </h4>
        <span className="chev">
          <ChevronRight size={16} />
        </span>
      </button>
      {isOpen && <div className="coll__body">{children}</div>}
    </section>
  )
}
