"use client"

// ============================================================
// CadHeroGallery
// render[0] is the large hero; renders[1..4] are up to four
// thumbs beside it, laid out to fill the column for any count (an
// ERP design has any number of renders). Past the fifth, the last
// thumb says how many more the lightbox holds. Clicks don't reorder
// anything — they open the lightbox at that index.
// ============================================================

import { useState } from "react"
import { Box, Download, GitCompare } from "lucide-react"
import type { CadVersion } from "@/types/order"

interface CadHeroGalleryProps {
  cadVersions: CadVersion[]
  poNumber: string
  activeVersionNumber: string
  onVersionChange: (versionNumber: string) => void
  onOpenLightbox: (index: number) => void
  // Download and Compare do nothing yet; an ERP order (Step 4a) leaves them out.
  showActions?: boolean
  // The ERP could not turn its render paths into links just now (Step 4a).
  imagesUnavailable?: boolean
}

export function CadHeroGallery({
  cadVersions,
  poNumber,
  activeVersionNumber,
  onVersionChange,
  onOpenLightbox,
  showActions = true,
  imagesUnavailable = false,
}: CadHeroGalleryProps) {
  // A version whose hero image would not load (an ERP link lasts two hours): say so instead of a broken image.
  const [brokenVersion, setBrokenVersion] = useState<string | null>(null)
  const activeVersion =
    cadVersions.find((v) => v.versionNumber === activeVersionNumber) ||
    cadVersions[cadVersions.length - 1]

  if (!activeVersion) return null

  const imagesFailed = imagesUnavailable || brokenVersion === activeVersion.versionNumber
  const hero = imagesFailed ? undefined : activeVersion.renders[0]
  const thumbs = imagesFailed ? [] : activeVersion.renders.slice(1, 5)
  const more = imagesFailed ? 0 : activeVersion.renders.length - 5

  return (
    <section>
      <div className="cad-hero" data-solo={thumbs.length === 0 ? "" : undefined}>
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
              onError={() => setBrokenVersion(activeVersion.versionNumber)}
            />
          )}
          {imagesFailed && (
            <div className="cad-hero__unavailable">The images could not load just now. Refresh the page to try again.</div>
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

        {thumbs.length > 0 && (
          <div className="cad-hero__thumbs" data-count={thumbs.length}>
            {thumbs.map((render, i) => {
              const idx = i + 1 // renders index, since we skipped the hero
              return (
                <button
                  key={idx}
                  type="button"
                  className="cad-hero__thumb"
                  data-n={render.label}
                  data-more={more > 0 && i === thumbs.length - 1 ? `+${more} more` : undefined}
                  onClick={() => onOpenLightbox(idx)}
                  aria-label={`Open ${render.label} in viewer`}
                >
                  <img src={render.imageUrl} alt={render.label} />
                </button>
              )
            })}
          </div>
        )}

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
          {showActions && (
            <div className="cad-hero__actions">
              <button type="button" className="btn btn--ghost btn--sm">
                <Download size={14} /> Download
              </button>
              <button type="button" className="btn btn--ghost btn--sm">
                <GitCompare size={14} /> Compare
              </button>
            </div>
          )}
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
