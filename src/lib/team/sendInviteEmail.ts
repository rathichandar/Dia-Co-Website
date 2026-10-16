// ============================================================
// The invite email, shared by both invitation paths:
//   - createInvite: a Customer Admin invites a teammate from /team.
//   - acceptErpInvite: the ERP's Customer Master invites a customer's first
//     Customer Admin (POST /api/erp/invite; ERP_INTEGRATION_CONTRACT.md §9).
//
// inviteUserByEmail creates the unconfirmed auth user and sends Supabase's
// invite email. The link goes through /auth/callback, which forwards the
// token to /auth/confirm (the invite cannot use the PKCE ?code= exchange --
// see that route). If the caller's next step fails, deleteInvitedAuthUser
// removes the orphan so the email can be invited again.
//
// Admin client: auth.admin.* calls only, per the SS5 convention.
// ============================================================

import { createAdminClient } from "@/lib/supabase/admin"

export type SendInviteResult =
  | { ok: true; authUserId: string }
  | { ok: false; error: string }

export async function sendInviteEmail(email: string): Promise<SendInviteResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return {
      ok: false,
      error: "Server misconfiguration: NEXT_PUBLIC_SITE_URL is not set.",
    }
  }
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })

  if (error) {
    // Supabase rate-limits invite emails per project. Status 429 surfaces
    // when hit — give the user a specific error rather than the raw message.
    if (error.status === 429) {
      return {
        ok: false,
        error: "Email rate limit hit — try again in a few minutes.",
      }
    }
    return { ok: false, error: `Failed to send invitation: ${error.message}` }
  }

  const authUserId = data?.user?.id
  if (!authUserId) {
    // Defensive: Supabase should always return user.id on success. With no
    // id there is nothing to insert or clean up.
    return {
      ok: false,
      error: "Invitation succeeded but no user id was returned.",
    }
  }
  return { ok: true, authUserId }
}

// Compensating delete for an invite whose follow-up step failed. Errors are
// logged, never thrown: the caller reports the ORIGINAL failure.
export async function deleteInvitedAuthUser(
  authUserId: string,
  logTag: string,
): Promise<void> {
  try {
    const { error } = await createAdminClient().auth.admin.deleteUser(authUserId)
    if (error) console.error(`[${logTag}] compensating deleteUser failed:`, error)
  } catch (cleanupErr) {
    console.error(`[${logTag}] compensating deleteUser threw:`, cleanupErr)
  }
}
