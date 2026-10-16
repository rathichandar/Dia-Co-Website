// Server component. Wraps the list of pending invites; empty state handled
// inline. Each row is a client component (needs local state for resend
// feedback + revoke confirm dialog).

import type { PendingInvite } from "../page"
import { PendingInviteRow } from "./PendingInviteRow"

interface PendingInvitesListProps {
  invites: PendingInvite[]
}

export function PendingInvitesList({ invites }: PendingInvitesListProps) {
  if (invites.length === 0) {
    return <p className="team-empty__inline">No pending invitations.</p>
  }
  return (
    <ul className="team-list team-list--invites">
      {invites.map((invite) => (
        <li key={invite.id}>
          <PendingInviteRow invite={invite} />
        </li>
      ))}
    </ul>
  )
}
