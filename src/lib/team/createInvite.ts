"use server"

// ============================================================
// createInvite Server Action — Phase 2C Sub-session 5.
//
// Called by the /team invite form. Customer Admin creates a pending invite
// for a new sales_rep or customer_admin at their own company.
//
// Two-client pattern (SS5 convention):
//   - Cookie-bound client: validate caller identity, fetch caller's
//     user_profiles row (customer_id + can_manage_team check), then
//     INSERT pending_invites (RLS re-validates all of that at row level).
//   - Admin client: only for supabase.auth.admin.inviteUserByEmail /
//     deleteUser calls. These require service_role.
//
// Ordering matters:
//   1. Validate inputs cheap-first (email/name non-empty, role in whitelist).
//   2. Fetch caller profile — bail with clean error if not authenticated,
//      not a customer_admin/super_admin, or lacks can_manage_team.
//   3. Call inviteUserByEmail — creates unconfirmed auth user + sends email.
//      If this fails, bail; no cleanup needed (no auth user was created).
//   4. INSERT pending_invites with auth_user_id populated from step 3.
//      If this fails, run compensating delete on the auth user created in
//      step 3 (otherwise we've leaked an orphan auth.users row that would
//      block future re-invites to the same email).
// ============================================================

import { createClient } from "@/lib/supabase/server"
import { deleteInvitedAuthUser, sendInviteEmail } from "./sendInviteEmail"

export type InviteRole = "sales_rep" | "customer_admin"

export interface CapabilityFlags {
  can_place_orders: boolean
  can_view_all_company_orders: boolean
  can_manage_team: boolean
  can_manage_order_owners: boolean
  can_view_invoices: boolean
  can_make_payments: boolean
}

export type CreateInviteResult =
  | { ok: true; inviteId: string }
  | { ok: false; error: string }

const INVITE_TTL_DAYS = 7

export async function createInvite(args: {
  email: string
  firstName: string
  lastName: string
  role: InviteRole
  flags: CapabilityFlags
}): Promise<CreateInviteResult> {
  // ---- 1. Input validation (fail fast, no DB round-trips) ----
  const email = args.email.trim().toLowerCase()
  const firstName = args.firstName.trim()
  const lastName = args.lastName.trim()

  if (!email) return { ok: false, error: "Email is required." }
  if (!firstName) return { ok: false, error: "First name is required." }
  if (!lastName) return { ok: false, error: "Last name is required." }
  if (args.role !== "sales_rep" && args.role !== "customer_admin") {
    return { ok: false, error: "Invalid role." }
  }

  // ---- 2. Caller identity + capability check ----
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be logged in." }

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("customer_id, role, can_manage_team")
    .eq("id", user.id)
    .maybeSingle()

  if (profileErr) {
    return { ok: false, error: `Profile lookup failed: ${profileErr.message}` }
  }
  if (!profile) {
    return { ok: false, error: "Your account is not set up correctly." }
  }
  if (!profile.customer_id) {
    // super_admin has no customer_id; SS5 /team is scoped to a customer.
    // Super Admin invite flow lands in SS6 /admin.
    return {
      ok: false,
      error: "Super admin invites are not supported in this flow. Use /admin.",
    }
  }
  if (!profile.can_manage_team) {
    return {
      ok: false,
      error: "You don't have permission to invite team members.",
    }
  }

  // ---- 3. Send the Supabase invite (creates unconfirmed auth user) ----
  // Shared with the ERP's invitation path (sendInviteEmail.ts).
  const sent = await sendInviteEmail(email)
  if (!sent.ok) return { ok: false, error: sent.error }
  const authUserId = sent.authUserId

  // ---- 4. INSERT pending_invites (RLS enforces customer + capability) ----
  // No transaction — this is a single statement. If it fails, the
  // compensating delete below cleans up the orphaned auth user.
  const { data: inserted, error: insertErr } = await supabase
    .from("pending_invites")
    .insert({
      email,
      first_name: firstName,
      last_name: lastName,
      role: args.role,
      invited_by_user_id: user.id,
      customer_id: profile.customer_id,
      auth_user_id: authUserId,
      can_place_orders: args.flags.can_place_orders,
      can_view_all_company_orders: args.flags.can_view_all_company_orders,
      can_manage_team: args.flags.can_manage_team,
      can_manage_order_owners: args.flags.can_manage_order_owners,
      can_view_invoices: args.flags.can_view_invoices,
      can_make_payments: args.flags.can_make_payments,
      expires_at: new Date(
        Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select("id")
    .maybeSingle()

  if (insertErr || !inserted) {
    // Compensating delete: try to remove the orphan auth user we created
    // in step 3. The caller cares about the ORIGINAL failure (the reason the
    // INSERT didn't land), not the cleanup.
    await deleteInvitedAuthUser(authUserId, "createInvite")

    if (insertErr?.code === "23505") {
      // Partial unique index on lower(email) where status=pending (globally
      // unique, per SS5 File 2). Message deliberately doesn't disclose
      // whether the conflicting invite is on this customer or another —
      // that would leak cross-customer activity.
      return {
        ok: false,
        error:
          "An invite is already pending for this email. If you didn't create it, contact support.",
      }
    }
    if (insertErr?.code === "42501") {
      // RLS violation — shouldn't happen since we pre-checked can_manage_team,
      // but surface it clearly if the pre-check ever drifts out of sync.
      return {
        ok: false,
        error: "Permission denied. You cannot create this invite.",
      }
    }
    return {
      ok: false,
      error: `Failed to create invitation: ${insertErr?.message ?? "unknown error"}`,
    }
  }

  return { ok: true, inviteId: inserted.id }
}
