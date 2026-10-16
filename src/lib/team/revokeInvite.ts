"use server"

// ============================================================
// revokeInvite Server Action — Phase 2C Sub-session 5.
//
// Called by the "Revoke" button on a pending invite in /team. Cancels the
// invite: deletes the unconfirmed auth user and marks the pending_invites
// row status='revoked'.
//
// Atomicity: the SELECT-FOR-UPDATE + status branch + UPDATE dance lives in
// the revoke_pending_invite RPC (Migration E). PostgREST auto-commits each
// JS-side statement, so row locking must happen inside a Postgres function.
// See the RPC's SQL for the transaction contract.
//
// Two-client pattern (SS5 convention):
//   - Cookie-bound client: caller identity check + pre-fetch of invite
//     (non-locking) + the RPC call itself (RLS still applies).
//   - Admin client: getUserById (confirmation-state race check) +
//     deleteUser (the actual auth user cleanup).
//
// Ordering (JS-side, sequential):
//   1. Input + auth checks (fail fast, no DB).
//   2. Fetch caller's user_profiles row — capability check for a clean
//      error message before we hit the RPC (RLS would reject too, but this
//      surfaces a nicer "you don't have permission" over a "not found").
//   3. Pre-fetch the invite (non-locking) — pulls status + auth_user_id.
//      Early exit on state issues before the more expensive admin API.
//   4. Confirmation-state race check via admin.getUserById.
//      Belt-and-suspenders with the RPC's FOR UPDATE lock. Even if the
//      invitee confirms milliseconds after this check, the RPC's lock +
//      status re-check catches it. But this check catches the common case
//      of "invitee already confirmed but finalize hasn't fired yet" cleanly.
//   5. Call revoke_pending_invite RPC — atomic SELECT FOR UPDATE + UPDATE.
//   6. admin.deleteUser on the returned auth_user_id — swallow errors + log.
//      A stuck orphan auth user is recoverable via manual admin action; a
//      failure here should not block the user seeing the invite as revoked.
// ============================================================

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type RevokeInviteResult =
  | { ok: true }
  | { ok: false; error: string }

// RPC exception messages surfaced from Migration E's revoke_pending_invite.
// Kept as named constants so future renames are a one-place edit and the
// dispatch below reads as a switch on symbolic tokens, not string literals.
const RPC_ERROR = {
  NOT_FOUND: "invite_not_found",
  ALREADY_ACCEPTED: "invite_already_accepted",
  NOT_PENDING: "invite_not_pending",
} as const

export async function revokeInvite(inviteId: string): Promise<RevokeInviteResult> {
  // ---- 1. Input + auth ----
  if (!inviteId) return { ok: false, error: "Invite id is required." }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be logged in." }

  // ---- 2. Capability pre-check (clean error before RPC / RLS bounces us) ----
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
  // Super Admin bypasses the capability check via the RPC's SECURITY INVOKER
  // + pending_invites super_admin_all policy. Customer Admin needs
  // can_manage_team + owning customer.
  const isSuperAdmin = profile.role === "super_admin"
  if (!isSuperAdmin && !profile.can_manage_team) {
    return {
      ok: false,
      error: "You don't have permission to revoke team invitations.",
    }
  }

  // ---- 3. Pre-fetch invite (non-locking) for early-exit paths ----
  const { data: invite, error: fetchErr } = await supabase
    .from("pending_invites")
    .select("id, status, auth_user_id")
    .eq("id", inviteId)
    .maybeSingle()

  if (fetchErr) {
    return { ok: false, error: `Invite lookup failed: ${fetchErr.message}` }
  }
  if (!invite) {
    // Not found OR RLS filtered it out. Merged message — don't leak
    // cross-customer existence.
    return { ok: false, error: "Invite not found." }
  }
  if (invite.status === "accepted") {
    return {
      ok: false,
      error:
        "This invite has been accepted. Use team deactivation instead.",
    }
  }
  if (invite.status !== "pending") {
    return { ok: false, error: "This invite is no longer active." }
  }
  if (!invite.auth_user_id) {
    return {
      ok: false,
      error: "Invite is missing its auth user reference. Cannot revoke.",
    }
  }

  // ---- 4. Confirmation-state race check ----
  // If the invitee just confirmed their email but finalize_pending_invite
  // hasn't fired yet (still in the /reset-password window), the pending row
  // is still status='pending' but nuking the auth user would break their
  // in-progress acceptance. Check email_confirmed_at explicitly.
  const admin = createAdminClient()
  const { data: authUserData, error: authFetchErr } =
    await admin.auth.admin.getUserById(invite.auth_user_id)
  if (authFetchErr) {
    // If the auth user is gone (already-deleted race, etc.), we still want
    // to be able to mark the invite revoked. Log + continue rather than
    // hard-fail. The RPC's FOR UPDATE will re-validate state anyway.
    console.error(
      "[revokeInvite] admin.getUserById failed, proceeding:",
      authFetchErr,
    )
  } else if (authUserData?.user?.email_confirmed_at) {
    return {
      ok: false,
      error:
        "This invite was just accepted. Use team deactivation instead.",
    }
  }

  // ---- 5. Atomic revoke via RPC ----
  const { data: rpcAuthUserId, error: rpcErr } = await supabase.rpc(
    "revoke_pending_invite",
    { p_invite_id: inviteId },
  )
  if (rpcErr) {
    // Map RPC-raised exceptions (see Migration E header for the contract).
    // error.code is the SQLSTATE; error.message is the RAISE EXCEPTION token.
    if (rpcErr.code === "P0002" || rpcErr.message === RPC_ERROR.NOT_FOUND) {
      return { ok: false, error: "Invite not found." }
    }
    if (rpcErr.message === RPC_ERROR.ALREADY_ACCEPTED) {
      return {
        ok: false,
        error:
          "This invite has been accepted. Use team deactivation instead.",
      }
    }
    if (rpcErr.message === RPC_ERROR.NOT_PENDING) {
      return { ok: false, error: "This invite is no longer active." }
    }
    if (rpcErr.code === "42501") {
      return {
        ok: false,
        error: "Permission denied. You cannot revoke this invite.",
      }
    }
    return { ok: false, error: `Failed to revoke invite: ${rpcErr.message}` }
  }

  // ---- 6. Delete the auth user (best-effort) ----
  // The RPC returns the auth_user_id that was cleared. If it's null (invite
  // was already in a weird state), skip the delete. If the delete fails
  // (already deleted, transient, etc.), log + continue — the invite is
  // already marked revoked at this point, which is the user-visible truth.
  const authUserIdToDelete = rpcAuthUserId as string | null
  if (authUserIdToDelete) {
    try {
      const { error: deleteErr } = await admin.auth.admin.deleteUser(
        authUserIdToDelete,
      )
      if (deleteErr) {
        console.error(
          "[revokeInvite] admin.deleteUser failed after revoke:",
          deleteErr,
        )
      }
    } catch (deleteEx) {
      console.error(
        "[revokeInvite] admin.deleteUser threw after revoke:",
        deleteEx,
      )
    }
  }

  return { ok: true }
}
