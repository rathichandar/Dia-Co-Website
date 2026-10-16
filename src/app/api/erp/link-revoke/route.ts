import { createAdminClient } from '@/lib/supabase/admin'
import { deleteInvitedAuthUser } from '@/lib/team/sendInviteEmail'
import { erpReply, readSignedErpRequest, str, UUID_RE } from '@/lib/erp/erpRequest'

// POST /api/erp/link-revoke — Dia-Co took a customer login's Portal access away
// (ERP_INTEGRATION_CONTRACT.md §9). The ERP has already marked the link revoked, so its gateway refuses
// that login from now on; this route closes the Portal side to match.
// Body: { portal_user?, invite_ref?, customer_code?, reason? } — at least one of the first two.
//   portal_user -> user_profiles.deactivated_at = now(): /login refuses the account from its next sign-in
//                  (an open session lives until it expires, as with a deactivation on /team).
//   invite_ref  -> a still-pending invitation is revoked and its unconfirmed auth user deleted.
// Service-role client: no user session exists here; the ERP's signature, checked first, is the identity.
export async function POST(req: Request) {
  const signed = await readSignedErpRequest(req)
  if (!signed.ok) return signed.response
  const b = signed.body

  const portalUser = str(b, 'portal_user')
  const inviteRef = str(b, 'invite_ref')
  if ((portalUser && !UUID_RE.test(portalUser)) || (inviteRef && !UUID_RE.test(inviteRef)) || (!portalUser && !inviteRef)) {
    return erpReply(422, { ok: false, code: 'PORTAL_INVALID', message: 'Say which login or invitation to revoke.' })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return erpReply(503, { ok: false, code: 'PORTAL_NOT_CONFIGURED', message: 'The Portal cannot revoke access: its service key is not set.' })
  }

  const admin = createAdminClient()
  let deactivated = false
  let withdrawn = false

  if (portalUser) {
    const { data, error } = await admin
      .from('user_profiles')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('id', portalUser)
      .is('deactivated_at', null)
      .select('id')
    if (error) return erpReply(500, { ok: false, code: 'PORTAL_ERROR', message: `Could not deactivate the login: ${error.message}` })
    deactivated = (data?.length ?? 0) > 0
  }

  if (inviteRef) {
    const { data: invite, error: findErr } = await admin
      .from('pending_invites')
      .select('id, status, auth_user_id')
      .eq('erp_invite_ref', inviteRef)
      .maybeSingle()
    if (findErr) return erpReply(500, { ok: false, code: 'PORTAL_ERROR', message: `Invitation lookup failed: ${findErr.message}` })
    if (invite?.status === 'pending') {
      const { error: revokeErr } = await admin
        .from('pending_invites')
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('id', invite.id)
        .eq('status', 'pending')
      if (revokeErr) return erpReply(500, { ok: false, code: 'PORTAL_ERROR', message: `Could not revoke the invitation: ${revokeErr.message}` })
      withdrawn = true
      // Only an account that never finished signing up is deleted.
      if (invite.auth_user_id) {
        const { data: u } = await admin.auth.admin.getUserById(invite.auth_user_id)
        if (u?.user && !u.user.email_confirmed_at) await deleteInvitedAuthUser(invite.auth_user_id, 'erp link-revoke')
      }
    }
  }

  return erpReply(200, { ok: true, deactivated, withdrawn })
}
