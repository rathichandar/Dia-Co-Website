// ============================================================
// ErpYourRequests (ERP integration Step 4b; questions 2026-10-23)
// "Your requests" in an ERP order's rail: what Dia-Co did with the
// requests it answered, in its own words -- and the customer's questions
// about a change, open (Pending) or answered. The open approve / change /
// Priority Rush / cancel requests show on their own cards instead.
// ============================================================

import type { ErpRequest } from "@/types/order"

export function ErpYourRequests({ requests }: { requests: ErpRequest[] }) {
  if (!requests.length) return null
  return (
    <aside className="erp-req" aria-label="Your requests">
      <div className="erp-req__eyebrow">Your requests</div>
      {requests.map((r) => (
        <div key={r.id} className="erp-req__row">
          <div className="erp-req__head">
            <span className="erp-req__name">{requestName(r)}</span>
            <span className={`erp-req__chip erp-req__chip--${r.status}`}>{CHIP[r.status]}</span>
          </div>
          {r.kind === "question" && r.text && <p className="erp-req__text">&ldquo;{r.text}&rdquo;</p>}
          <p className="erp-req__meta">
            You asked on {requestDay(r.createdAt)}
            {r.status !== "pending" && r.decidedAt ? ` · Dia-Co replied on ${requestDay(r.decidedAt)}` : ""}
          </p>
          {r.note && <div className="erp-req__said">Dia-Co: {r.note}</div>}
        </div>
      ))}
    </aside>
  )
}

const CHIP: Record<ErpRequest["status"], string> = { pending: "Pending", done: "Done", declined: "Declined" }

export function requestName(r: ErpRequest): string {
  if (r.kind === "approve") return `Approval of ${r.againstV ?? "the design"}`
  if (r.kind === "modify") return `Changes to ${r.againstV ?? "the design"}`
  if (r.kind === "rush") return "Priority Rush"
  if (r.kind === "question") return "Question about a change"
  return "Cancellation"
}

export function requestDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
