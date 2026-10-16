"use server"

// ============================================================
// finalizeInvite Server Action — Phase 2C Sub-session 5.
//
// The invite-acceptance intercept. Called from the /reset-password Server
// Action (Group 3 modification) AFTER auth.updateUser({ password }) succeeds.
// Delegates to the finalize_pending_invite RPC (SS5 File 3), which atomically
// determines whether the invitee's just-confirmed auth session belongs to an
// outstanding pending invite; if so, provisions user_profiles + public.users
// rows and marks the invite accepted.
//
// For regular password-reset users (no pending_invites row for their
// auth.uid()), the RPC returns action='none' and this action is effectively
// a no-op — same session, same identity, /reset-password redirects to /orders
// as it always did.
//
// Two-client pattern (SS5 convention):
//   - Cookie-bound client: RPC call + getUser + signOut. All operate in the
//     invitee's session context.
//   - Admin client: admin.auth.admin.deleteUser in the 'expired' branch only.
//     Never touches DB tables. Never used in other branches.
//
// Action-branch behavior (mirrors the RPC's 5 return shapes + 1 JS-side error):
//   Action              | ok    | finalized | Session   | Admin cleanup
//   --------------------+-------+-----------+-----------+---------------
//   none                | true  | false     | keep      | —
//   accepted            | true  | true      | keep      | —
//   already_accepted    | true  | true      | keep      | —
//   expired             | false | false     | signOut   | deleteUser(uid)
//   revoked             | false | false     | signOut   | — (revoke_pending_invite already deleted)
//   error (JS-manufactured on RPC failure or unknown action) | false | false | signOut | —
//
// NB: Unlike Group 1 actions (createInvite / resendInvite / revokeInvite)
// which use an RPC_ERROR constant object to dispatch user-facing messages,
// this action treats all RPC failures uniformly (log + signOut + return
// action:'error'). No discrimination needed at this layer since every
// failure mode has identical caller behavior.
//
// Ordering in expired branch matters: getUser must run BEFORE signOut
// (signOut invalidates the session, subsequent getUser returns null).
// deleteUser runs BEFORE signOut for the same reason — deleteUser via
// the admin client doesn't depend on the invitee's session, but grouping
// admin-side cleanup before session teardown is easier to reason about.
//
// Error message sanitization: the 'error' branch returns the literal token
// 'finalize_failed' — never the raw RPC error.message. Raw errors may
// include internal detail (unexpected_role token, raw SQL error text like
// 'duplicate key value violates unique constraint …') that shouldn't leak
// into the caller's redirect URL / user-facing string. Raw error is logged
// server-side with error.code + error.message for debugging.
// ============================================================

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { callGateway, erpConfigured } from "@/lib/erp/gateway"

// Sanitized token for the JS-manufactured 'error' branch. Literal type
// (not plain string) so the caller pattern-matches against a known value.
const FINALIZE_ERROR_TOKEN = "finalize_failed" as const

export type FinalizeInviteResult =
  | { ok: true;  finalized: false; action: "none" }
  | { ok: true;  finalized: true;  action: "accepted";         customer_id: string; role: string }
  | { ok: true;  finalized: true;  action: "already_accepted"; customer_id: string; role: string }
  | { ok: false; finalized: false; action: "expired" }
  | { ok: false; finalized: false; action: "revoked" }
  | { ok: false; finalized: false; action: "error"; message: typeof FINALIZE_ERROR_TOKEN }

// Narrowed shape of the RPC's jsonb return. Cast site — supabase-js returns
// `unknown` for jsonb; this is our schema-boundary type contract.
// The ERP fields arrived with migration 20261015000001 (ERP integration Step 1).
type InviteOrigin = {
  erp_invite_ref: string | null
  invited_by_user_id: string | null
  first_name: string
  last_name: string
}
type RpcResult =
  | { action: "none" }
  | ({ action: "accepted";         customer_id: string; role: string } & InviteOrigin)
  | ({ action: "already_accepted"; customer_id: string; role: string } & InviteOrigin)
  | { action: "expired" }
  | { action: "revoked" }

// ERP integration Step 1 (ERP_INTEGRATION_CONTRACT.md §9): tell the ERP which customer
// login just signed up, so its gateway knows them from now on. An invitation from the ERP
// answers with its reference; a Customer Admin's team invitation names the inviter, whom
// the ERP must already know as an active Customer Admin (owner, 2026-10-15, D8).
// NON-FATAL: the Portal account is already complete. If the ERP cannot be reached the
// login works and simply sees no Dia-Co data until the link is confirmed; pressing the
// same confirmation again later answers the same (it is idempotent in the ERP).
async function confirmErpLink(r: { role: string } & InviteOrigin): Promise<void> {
  if (!erpConfigured()) return
  const payload = r.erp_invite_ref
    ? { invite_ref: r.erp_invite_ref }
    : { invited_by_portal_user: r.invited_by_user_id, role: r.role, first_name: r.first_name, last_name: r.last_name }
  const res = await callGateway("link.confirm", payload)
  if (!res.ok) {
    console.error("[finalizeInvite] ERP link.confirm failed:", { code: res.code, message: res.message })
  }
}

export async function finalizeInvite(): Promise<FinalizeInviteResult> {
  const supabase = await createClient()

  // ---- Call the atomic RPC ----
  const { data, error } = await supabase.rpc("finalize_pending_invite")

  if (error) {
    // Any RPC error: log raw for debugging, sign out defensively, return
    // sanitized token. Session is torn down so the invitee doesn't sit on
    // a confirmed auth user with no application-side identity.
    console.error(
      "[finalizeInvite] RPC error:",
      { code: error.code, message: error.message },
    )
    try {
      await supabase.auth.signOut()
    } catch (signOutEx) {
      console.error("[finalizeInvite] signOut after RPC error failed:", signOutEx)
    }
    return {
      ok: false,
      finalized: false,
      action: "error",
      message: FINALIZE_ERROR_TOKEN,
    }
  }

  const result = data as RpcResult

  switch (result.action) {
    case "none":
      return { ok: true, finalized: false, action: "none" }

    case "accepted":
      await confirmErpLink(result)
      return {
        ok: true,
        finalized: true,
        action: "accepted",
        customer_id: result.customer_id,
        role: result.role,
      }

    case "already_accepted":
      await confirmErpLink(result)
      return {
        ok: true,
        finalized: true,
        action: "already_accepted",
        customer_id: result.customer_id,
        role: result.role,
      }

    case "expired": {
      // RPC already marked pending_invites.status='expired' atomically.
      // Clean up the orphan auth user (invitee just set a password on a
      // row that expired — no profile, so they'd be a stranded confirmed
      // account otherwise). Then sign out.
      //
      // Order: getUser → deleteUser → signOut → return.
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.id) {
        const admin = createAdminClient()
        try {
          const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)
          if (deleteErr) {
            console.error(
              "[finalizeInvite] admin.deleteUser after expired failed:",
              deleteErr,
            )
          }
        } catch (deleteEx) {
          console.error(
            "[finalizeInvite] admin.deleteUser after expired threw:",
            deleteEx,
          )
        }
      } else {
        // Session was invalidated between the RPC call and getUser. Nothing
        // to delete; proceed to signOut (harmless if already signed out).
        console.error(
          "[finalizeInvite] expired branch: getUser returned no user, skipping deleteUser",
        )
      }

      try {
        await supabase.auth.signOut()
      } catch (signOutEx) {
        console.error(
          "[finalizeInvite] signOut after expired failed:",
          signOutEx,
        )
      }

      return { ok: false, finalized: false, action: "expired" }
    }

    case "revoked": {
      // revoke_pending_invite (Migration E) already called admin.deleteUser
      // on the auth user before flipping status. The invitee's session
      // cookie may still be alive client-side; sign out to clear it.
      // No deleteUser call — the auth user is already gone.
      try {
        await supabase.auth.signOut()
      } catch (signOutEx) {
        console.error(
          "[finalizeInvite] signOut after revoked failed:",
          signOutEx,
        )
      }
      return { ok: false, finalized: false, action: "revoked" }
    }

    default: {
      // Defensive: RPC returned an action the JS layer doesn't recognize.
      // Log it, sign out, return sanitized error token. Same treatment as
      // an RPC-level failure — the caller doesn't need to distinguish.
      console.error(
        "[finalizeInvite] unknown action from RPC:",
        result,
      )
      try {
        await supabase.auth.signOut()
      } catch (signOutEx) {
        console.error(
          "[finalizeInvite] signOut after unknown action failed:",
          signOutEx,
        )
      }
      return {
        ok: false,
        finalized: false,
        action: "error",
        message: FINALIZE_ERROR_TOKEN,
      }
    }
  }
}
