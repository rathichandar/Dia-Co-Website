// ============================================================
// AllAttachments
// All files associated with the order: customer uploads + CAD
// renders per version + quote PDFs.
// ============================================================

import { Download, FileText, Image as ImageIcon, Box, File as FileIcon } from "lucide-react"
import type { Order, Attachment } from "@/types/order"
import { Collapsible } from "./Collapsible"

interface AllAttachmentsProps {
  order: Order
}

interface FileInfo {
  filename: string
  sizeBytes: number
  url: string
  fileType: Attachment["fileType"]
  label?: string
}

export function AllAttachments({ order }: AllAttachmentsProps) {
  const totalFiles =
    order.customerAttachments.length +
    order.cadVersions.reduce((sum, v) => {
      return sum + v.renders.length + (v.quote.pdfUrl ? 1 : 0)
    }, 0)

  return (
    <Collapsible
      title="All attachments"
      count={`${totalFiles} file${totalFiles === 1 ? "" : "s"}`}
      defaultOpen={false}
    >
      {order.customerAttachments.length > 0 && (
        <AttachmentGroup
          title="From you"
          subtitle="Reference files you uploaded with this order"
          files={order.customerAttachments.map((att) => ({
            filename: att.filename,
            sizeBytes: att.sizeBytes,
            url: att.url,
            fileType: att.fileType,
          }))}
        />
      )}

      {order.cadVersions.map((v) => {
        const files: FileInfo[] = v.renders.map((r, idx) => ({
          filename: r.imageUrl.split("/").pop() || `render-${idx + 1}.jpg`,
          sizeBytes: 0,
          url: r.imageUrl,
          fileType: "image" as const,
          label: r.label,
        }))
        if (v.quote.pdfUrl) {
          files.push({
            filename: `${order.poNumber}-${v.versionNumber}-quote.pdf`,
            sizeBytes: 0,
            url: v.quote.pdfUrl,
            fileType: "pdf" as const,
            label: "Quote",
          })
        }
        return (
          <AttachmentGroup
            key={v.versionNumber}
            title={`CAD ${v.versionNumber}${v.isLatest ? " (latest)" : ""}`}
            subtitle={`Delivered ${v.deliveredAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })} · Quote: $${v.quote.estimatedTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            files={files}
          />
        )
      })}
    </Collapsible>
  )
}

function AttachmentGroup({
  title,
  subtitle,
  files,
}: {
  title: string
  subtitle?: string
  files: FileInfo[]
}) {
  return (
    <div className="uploaded-group">
      <div className="uploaded-group__head">{title}</div>
      {subtitle && <p className="uploaded-group__sub">{subtitle}</p>}
      <div className="uploaded-list">
        {files.map((file, idx) => (
          <a
            key={idx}
            href={file.url}
            download={file.filename}
            className="uploaded-row"
          >
            <span className="ico">
              <FileTypeIcon fileType={file.fileType} />
            </span>
            <div>
              <div className="n">{file.filename}</div>
              {file.label && <div className="label">{file.label}</div>}
            </div>
            <span className="meta">
              {file.sizeBytes > 0 ? formatFileSize(file.sizeBytes) : "—"}
            </span>
            <span className="dl">
              <Download size={14} />
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

function FileTypeIcon({ fileType }: { fileType: Attachment["fileType"] }) {
  const size = 18
  switch (fileType) {
    case "image":
      return <ImageIcon size={size} />
    case "pdf":
      return <FileText size={size} />
    case "cad_file":
      return <Box size={size} />
    default:
      return <FileIcon size={size} />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
