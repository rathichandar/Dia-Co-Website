// Server component. Partitions members into active + deactivated
// subsections. Renders empty state if there are no active members.

import type { TeamMember } from "../page"
import { TeamMemberRow } from "./TeamMemberRow"

interface TeamMembersListProps {
  members: TeamMember[]
  currentUserId: string
}

export function TeamMembersList({
  members,
  currentUserId,
}: TeamMembersListProps) {
  const active = members.filter((m) => m.deactivated_at === null)
  const deactivated = members.filter((m) => m.deactivated_at !== null)

  return (
    <>
      <h3 className="team-subsection__title">Active</h3>
      {active.length === 0 ? (
        <p className="team-empty__inline">
          Invite your first team member above.
        </p>
      ) : (
        <ul className="team-list team-list--members">
          {active.map((member) => (
            <li key={member.id}>
              <TeamMemberRow
                member={member}
                isSelf={member.id === currentUserId}
              />
            </li>
          ))}
        </ul>
      )}

      {deactivated.length > 0 && (
        <>
          <h3 className="team-subsection__title team-subsection__title--deactivated">
            Deactivated
          </h3>
          <ul className="team-list team-list--members">
            {deactivated.map((member) => (
              <li key={member.id}>
                <TeamMemberRow
                  member={member}
                  isSelf={member.id === currentUserId}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
