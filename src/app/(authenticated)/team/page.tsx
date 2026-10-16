// ============================================================
// Team management page — Phase 2C Sub-session 5.
// Route: /team
// Server Component. Fetches caller profile in one pass; branches to the
// customer-side layout or the super-admin empty state before doing any
// team-scoped fetches.
//
// Permission gate: if caller.can_manage_team is false (and they're not a
// super_admin), render an unauthorized message without fetching invites or
// members. Do NOT redirect — user might be on the wrong page by design;
// let them see the message.
// ============================================================

import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TeamHeader } from "./_components/TeamHeader"
import { InviteForm } from "./_components/InviteForm"
import { PendingInvitesList } from "./_components/PendingInvitesList"
import { TeamMembersList } from "./_components/TeamMembersList"

export const metadata: Metadata = {
  title: "Team · Dia-Co",
}

export type PendingInvite = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "sales_rep" | "customer_admin"
  created_at: string
  expires_at: string
  can_place_orders: boolean
  can_view_all_company_orders: boolean
  can_manage_team: boolean
  can_view_invoices: boolean
  can_make_payments: boolean
  can_manage_order_owners: boolean
  // null for an invitation sent from the ERP's Customer Master (migration 20261015000001)
  invited_by_user_id: string | null
}

export type TeamMember = {
  id: string
  role: "sales_rep" | "customer_admin"
  customer_id: string
  can_place_orders: boolean
  can_view_all_company_orders: boolean
  can_manage_team: boolean
  can_view_invoices: boolean
  can_make_payments: boolean
  can_manage_order_owners: boolean
  deactivated_at: string | null
  full_name: string
  email: string
}

export default async function TeamPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("id, role, customer_id, can_manage_team")
    .eq("id", user.id)
    .maybeSingle()

  if (profileErr) {
    return (
      <div className="diaco-design page-wrap">
        <div className="team-empty">
          <p>Something went wrong loading your account.</p>
          <p className="team-empty__hint">Please try again or contact support.</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="diaco-design page-wrap">
        <div className="team-empty">
          <p>Your account is not fully set up.</p>
          <p className="team-empty__hint">Please contact support.</p>
        </div>
      </div>
    )
  }

  // Super Admin empty state: /team is scoped to a customer; SS6 /admin
  // handles Dia-Co side identity management. Route is not built yet.
  if (profile.role === "super_admin") {
    return (
      <div className="diaco-design page-wrap">
        <div className="team-super-admin-empty">
          <h1 className="team-page-title">Team management</h1>
          <p className="team-page-sub">
            Super Admins manage Dia-Co staff (AM, AR, other Super Admins) via
            the admin panel. This page is for customer-side team management.
          </p>
          <Link href="/admin" className="team-super-admin-empty__cta">
            Go to admin panel →
          </Link>
        </div>
      </div>
    )
  }

  // Customer-side users need can_manage_team to view/manage. This is the
  // clean-error branch — RLS would silently return empty lists otherwise.
  if (!profile.can_manage_team) {
    return (
      <div className="diaco-design page-wrap">
        <div className="team-empty">
          <p>You don&apos;t have permission to manage team members.</p>
          <p className="team-empty__hint">Contact your Customer Admin.</p>
        </div>
      </div>
    )
  }

  // Parallel fetches — customer name, pending invites, user_profiles.
  //
  // NOTE: user_profiles and public.users do NOT have a direct FK between
  // them (both reference auth.users.id independently). PostgREST's embedded
  // join syntax (users!inner(...)) requires a declared FK — without one it
  // silently returns an empty embed and the outer row count is 0. That was
  // the "empty team list" bug caught in Phase A. Fix: fetch profiles here,
  // then fetch public.users rows in a second query and merge in JS.
  const [customerRes, invitesRes, profilesRes] = await Promise.all([
    supabase
      .from("customers")
      .select("name")
      .eq("id", profile.customer_id!)
      .maybeSingle(),
    supabase
      .from("pending_invites")
      .select(
        "id, email, first_name, last_name, role, created_at, expires_at, can_place_orders, can_view_all_company_orders, can_manage_team, can_view_invoices, can_make_payments, can_manage_order_owners, invited_by_user_id",
      )
      .eq("customer_id", profile.customer_id!)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_profiles")
      .select(
        "id, role, customer_id, can_place_orders, can_view_all_company_orders, can_manage_team, can_view_invoices, can_make_payments, can_manage_order_owners, deactivated_at",
      )
      .eq("customer_id", profile.customer_id!)
      .in("role", ["sales_rep", "customer_admin"]),
  ])

  const companyName = customerRes.data?.name ?? "Your team"
  const pendingInvites = (invitesRes.data ?? []) as PendingInvite[]

  type ProfileRow = Omit<TeamMember, "full_name" | "email">
  const profileRows = (profilesRes.data ?? []) as ProfileRow[]

  // Second-hop fetch: public.users for the ids we just found. Guard against
  // the empty-array case — an .in() with [] would return 0 rows and cost a
  // round trip for nothing.
  const userDisplayMap = new Map<string, { full_name: string; email: string }>()
  if (profileRows.length > 0) {
    const ids = profileRows.map((p) => p.id)
    const { data: usersData } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", ids)
    for (const u of (usersData ?? []) as {
      id: string
      full_name: string
      email: string
    }[]) {
      userDisplayMap.set(u.id, { full_name: u.full_name, email: u.email })
    }
  }

  const teamMembers: TeamMember[] = profileRows
    .map((row) => {
      const display = userDisplayMap.get(row.id)
      if (!display) {
        // Defensive: user_profiles row without a matching public.users row —
        // the SS4 Migration 18 gap class. Should not happen in SS5+ data but
        // log so we notice if it recurs, and drop the row from the list so
        // the UI doesn't crash trying to render undefined fields.
        console.error(
          "[team page] user_profiles row without matching public.users row",
          { userId: row.id },
        )
        return null
      }
      return { ...row, full_name: display.full_name, email: display.email }
    })
    .filter((m): m is TeamMember => m !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  return (
    <div className="diaco-design page-wrap">
      <TeamHeader
        companyName={companyName}
        memberCount={teamMembers.length}
        pendingCount={pendingInvites.length}
      />

      <section className="team-section">
        <h2 className="team-section__title">Invite team member</h2>
        <InviteForm />
      </section>

      <section className="team-section">
        <h2 className="team-section__title">Pending invitations</h2>
        <PendingInvitesList invites={pendingInvites} />
      </section>

      <section className="team-section">
        <h2 className="team-section__title">Team members</h2>
        <TeamMembersList members={teamMembers} currentUserId={user.id} />
      </section>
    </div>
  )
}
