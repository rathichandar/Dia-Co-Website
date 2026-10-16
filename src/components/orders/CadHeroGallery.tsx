"use client"

// ============================================================
// CadHeroGallery
// Fixed-position grid: render[0] is the large hero (always),
// renders[1..5] are the four small thumbs (always). Clicks
// don't reorder anything — they open the lightbox at that index.
// ============================================================

import { Box, Download, GitCompare } from "lucide-react"
import type { CadVersion } from "@/types/order"

interface CadHeroGalleryProps {
  cadVersions: CadVersion[]
  poNumber: string
  activeVersionNumber: string
  onVersionChange: (versionNumber: string) => void
  onOpenLightbox: (index: number) => void
}

export function CadHeroGallery({
  cadVersions,
  poNumber,
  activeVersionNumber,
  onVersionChange,
  onOpenLightbox,
}: CadHeroGalleryProps) {
  const activeVersion =
    cadVersions.find((v) => v.versionNumber === activeVersionNumber) ||
    cadVersions[cadVersions.length - 1]

  if (!activeVersion) return null

  const hero = activeVersion.renders[0]
  const thumbs = activeVersion.renders.slice(1, 5)

  return (
    <section>
      <div className="cad-hero">
        <div
          className="cad-hero__main"
          role="button"
          tabIndex={0}
          onClick={() => onOpenLightbox(0)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onOpenLightbox(0)
            }
          }}
          aria-label={`Open ${hero?.label ?? "hero render"} in viewer`}
        >
          <span className="hero-badge">CAD · {activeVersion.versionNumber}</span>
          {hero && (
            <img
              src={hero.imageUrl}
              alt={`${poNumber} CAD ${activeVersion.versionNumber} — ${hero.label}`}
              loading="eager"
            />
          )}
          {activeVersion.threeDViewerUrl && (
            <a
              href={activeVersion.threeDViewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-3d"
              onClick={(e) => e.stopPropagation()}
            >
              <Box size={14} /> View 3D model
            </a>
          )}
        </div>

        <div className="cad-hero__thumbs">
          {thumbs.map((render, i) => {
            const idx = i + 1 // renders index, since we skipped the hero
            return (
              <button
                key={idx}
                type="button"
                className="cad-hero__thumb"
                data-n={render.label}
                onClick={() => onOpenLightbox(idx)}
                aria-label={`Open ${render.label} in viewer`}
              >
                <img src={render.imageUrl} alt={render.label} />
              </button>
            )
          })}
        </div>

        <div className="cad-hero__meta">
          <div className="cad-hero__version">
            <span style={{ color: "var(--fg-3)" }}>Showing</span>
            <select
              value={activeVersionNumber}
              onChange={(e) => onVersionChange(e.target.value)}
            >
              {cadVersions.map((v) => (
                <option key={v.versionNumber} value={v.versionNumber}>
                  {v.versionNumber}
                  {v.isLatest ? " (latest)" : ""} ·{" "}
                  {v.deliveredAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </option>
              ))}
            </select>
            <span style={{ color: "var(--fg-3)" }}>
              · Last update{" "}
              {activeVersion.deliveredAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="cad-hero__actions">
            <button type="button" className="btn btn--ghost btn--sm">
              <Download size={14} /> Download
            </button>
            <button type="button" className="btn btn--ghost btn--sm">
              <GitCompare size={14} /> Compare
            </button>
          </div>
        </div>
      </div>

      {activeVersion.notesFromDesigner && (
        <div className="cad-note" style={{ marginTop: 12 }}>
          <div className="eyebrow">
            Delivery note · CAD {activeVersion.versionNumber}
          </div>
          <p style={{ margin: 0 }}>{activeVersion.notesFromDesigner}</p>
        </div>
      )}
    </section>
  )
}
