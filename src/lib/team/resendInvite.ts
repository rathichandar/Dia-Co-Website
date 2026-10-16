"use server"

// ============================================================
// resendInvite Server Action — Phase 2C Sub-session 5.
//
// Called by the "Resend" button on a pending invite in /team. Re-issues the
// Supabase invite email (Supabase reuses the existing unconfirmed auth user
// and regenerates the token) and pushes the pending_invites row's
// expires_at 7 more days into the future.
//
// Access control:
//   - RLS on pending_invites SELECT scopes visibility to the caller's own
//     customer + can_manage_team. If the caller can't SELECT the row, they
//     can't resend it — the .maybeSingle() below returns null.
//   - Super Admin's ALL policy covers the same paths.
//
// Ordering:
//   1. Auth check.
//   2. SELECT the invite (RLS filters). If not found → clean error.
//   3. Validate status = 'pending' (accepted / revoked / expired invites
//      cannot be resent).
//   4. Call inviteUserByEmail on the same email + same redirectTo. Supabase
//      finds the existing unconfirmed auth user by email and regenerates the
//      link + resends the email.
//   5. UPDATE pending_invites SET expires_at = now + 7 days.
//      updated_at is bumped automatically by the set_updated_at trigger.
//
// No compensating action needed here — the auth user already exists (from
// createInvite), and we're not inserting anything new. If the UPDATE fails
// after inviteUserByEmail succeeded, the invitee has a fresh valid email
// but the pending_invites.expires_at stayed at its old value. Worst case:
// they still have until the OLD expires_at to accept; UI just shows the
// stale expiry. Recoverable by clicking Resend again.
// ============================================================

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type ResendInviteResult =
  | { ok: true }
  | { ok: false; error: string }

const INVITE_TTL_DAYS = 7

export async function resendInvite(inviteId: string): Promise<ResendInviteResult> {
  if (!inviteId) return { ok: false, error: "Invite id is required." }

  const supabase = await createClient()

  // ---- 1. Auth check ----
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be logged in." }

  // ---- 2. Capability pre-check (clean error before RLS bounces us) ----
  // Mirrors revokeInvite.ts. Without this, a customer_admin without
  // can_manage_team would hit RLS on the SELECT below and get a confusing
  // "Invite not found" — this surfaces a clearer permission error instead.
  // Super Admin bypasses via the pending_invites super_admin_all policy.
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("role, can_manage_team")
    .eq("id", user.id)
    .maybeSingle()
  if (profileErr) {
    return { ok: false, error: `Profile lookup failed: ${profileErr.message}` }
  }
  if (!profile) {
    return { ok: false, error: "Your account is not set up correctly." }
  }
  const isSuperAdmin = profile.role === "super_admin"
  if (!isSuperAdmin && !profile.can_manage_team) {
    return {
      ok: false,
      error: "You don't have permission to resend team invitations.",
    }
  }

  // ---- 3. Fetch the invite (RLS scopes visibility) ----
  const { data: invite, error: fetchErr } = await supabase
    .from("pending_invites")
    .select("id, email, status, auth_user_id")
    .eq("id", inviteId)
    .maybeSingle()

  if (fetchErr) {
    return { ok: false, error: `Invite lookup failed: ${fetchErr.message}` }
  }
  if (!invite) {
    // Either the row doesn't exist or RLS filtered it out. Same message
    // either way — don't leak invite existence across customers.
    return { ok: false, error: "Invite not found." }
  }

  // ---- 4. Status validation ----
  if (invite.status !== "pending") {
    return { ok: false, error: "Only pending invites can be resent." }
  }
  if (!invite.auth_user_id) {
    // Defensive: pending status implies auth_user_id was populated at
    // createInvite time and not cleared. If it's null on a pending row,
    // something is corrupt — bail.
    return {
      ok: false,
      error: "Invite is missing its auth user reference. Revoke and re-create.",
    }
  }

  // ---- 5. Re-send the Supabase invite email ----
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return {
      ok: false,
      error: "Server misconfiguration: NEXT_PUBLIC_SITE_URL is not set.",
    }
  }
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`

  const admin = createAdminClient()
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    invite.email,
    { redirectTo },
  )
  if (inviteErr) {
    if (inviteErr.status === 429) {
      return {
        ok: false,
        error: "Email rate limit hit — try again in a few minutes.",
      }
    }
    return {
      ok: false,
      error: `Failed to resend invitation: ${inviteErr.message}`,
    }
  }

  // ---- 6. Extend expires_at ----
  const { error: updateErr } = await supabase
    .from("pending_invites")
    .update({
      expires_at: new Date(
        Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .eq("id", inviteId)

  if (updateErr) {
    if (updateErr.code === "42501") {
      return {
        ok: false,
        error: "Permission denied. You cannot resend this invite.",
      }
    }
    // The email already went out (step 4). Log + return a soft error so
    // the caller knows the DB side didn't catch up.
    console.error(
      "[resendInvite] email sent but expires_at update failed:",
      updateErr,
    )
    return {
      ok: false,
      error: `Email sent, but expiry update failed: ${updateErr.message}. The invite still works until the original expiry.`,
    }
  }

  return { ok: true }
}
