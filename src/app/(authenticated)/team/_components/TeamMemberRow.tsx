"use client"

import { FlagToggle } from "./FlagToggle"
import { DeactivateButton } from "./DeactivateButton"
import type { TeamMember } from "../page"
import type { CapabilityFlag } from "@/lib/team/updateTeamMemberFlags"

const ROLE_LABEL: Record<TeamMember["role"], string> = {
  sales_rep: "Sales Rep",
  customer_admin: "Customer Admin",
}

// Same 6-flag order as InviteForm. Kept as a const array for stable
// iteration in the FlagToggle map.
const FLAG_ORDER: Array<{ key: CapabilityFlag; label: string }> = [
  { key: "can_place_orders", label: "Place orders" },
  { key: "can_view_all_company_orders", label: "View all company orders" },
  { key: "can_manage_team", label: "Manage team" },
  { key: "can_view_invoices", label: "View invoices" },
  { key: "can_make_payments", label: "Make payments" },
  { key: "can_manage_order_owners", label: "Manage order owners" },
]

interface TeamMemberRowProps {
  member: TeamMember
  isSelf: boolean
}

export function TeamMemberRow({ member, isSelf }: TeamMemberRowProps) {
  // No runtime super_admin check here. Assertion lives at the DB fetch:
  // page.tsx uses `.in("role", ["sales_rep", "customer_admin"])`, and
  // TeamMember["role"] is narrowly typed to that union. A super_admin
  // reaching this component would mean the DB filter was bypassed — a
  // much bigger bug than a silently disabled row, and one that belongs
  // upstream, not here.
  const isDeactivated = member.deactivated_at !== null
  const rowClass = isDeactivated
    ? "team-member-row team-member-row--deactivated"
    : "team-member-row"

  return (
    <div className={rowClass}>
      <div className="team-member-row__meta">
        <div className="team-member-row__name">
          {member.full_name}
          {isSelf && <span className="team-member-row__self">(you)</span>}
        </div>
        <div className="team-member-row__email">{member.email}</div>
        <div className="team-member-row__badges">
          <span className={`team-role-badge team-role-badge--${member.role}`}>
            {ROLE_LABEL[member.role]}
          </span>
          {isDeactivated && (
            <span className="team-status-badge team-status-badge--deactivated">
              Deactivated
            </span>
          )}
        </div>
      </div>

      <div className="team-member-row__flags">
        {FLAG_ORDER.map(({ key, label }) => (
          <FlagToggle
            key={key}
            userId={member.id}
            flag={key}
            label={label}
            currentValue={member[key]}
            disabled={isSelf || isDeactivated}
          />
        ))}
      </div>

      <div className="team-member-row__actions">
        <DeactivateButton
          userId={member.id}
          memberName={member.full_name}
          isDeactivated={isDeactivated}
          disabled={isSelf}
        />
      </div>
    </div>
  )
}
