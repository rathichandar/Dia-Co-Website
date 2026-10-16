// Server component. Static header at the top of /team.

interface TeamHeaderProps {
  companyName: string
  memberCount: number
  pendingCount: number
}

export function TeamHeader({
  companyName,
  memberCount,
  pendingCount,
}: TeamHeaderProps) {
  const memberLabel = memberCount === 1 ? "team member" : "team members"
  const pendingLabel =
    pendingCount === 1 ? "pending invitation" : "pending invitations"

  return (
    <header className="team-header">
      <h1 className="team-page-title">{companyName}</h1>
      <p className="team-page-sub">
        <span className="team-page-sub__count">{memberCount}</span> {memberLabel}
        {" · "}
        <span className="team-page-sub__count">{pendingCount}</span>{" "}
        {pendingLabel}
      </p>
    </header>
  )
}
