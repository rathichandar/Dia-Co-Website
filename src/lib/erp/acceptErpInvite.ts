// ============================================================
// An invitation from the ERP's Customer Master (ERP_INTEGRATION_CONTRACT.md §9).
// Called only by POST /api/erp/invite, after its signature check.
//
// The ERP has already decided who may invite and which customer this is
// (portal_invite_prepare). Here we:
//   1. Find or create the customer's login shell (customers.customer_code =
//      the ERP's code). The ERP holds the real record; we keep its name in step.
//   2. Same reference again -> pending: re-send the email and give it 7 more
//      days; accepted: nothing to do; revoked/expired: refuse, so the ERP can
//      start a fresh invitation.
//   3. New reference -> send the invite email, then record the invitation
//      (customer_admin, every Customer Admin capability, erp_invite_ref, no
//      Portal inviter). If the record fails, delete the auth user just made.
//
// Service-role client for table writes: a deliberate exception to admin.ts's
// "auth.admin.* only" rule. This path has no signed-in user for RLS to act
// as -- the ERP's signature is the identity, checked before we get here.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { deleteInvitedAuthUser, sendInviteEmail } from '@/lib/team/sendInviteEmail'

const INVITE_TTL_DAYS = 7

// A customer's first Customer Admin holds every Customer Admin capability -- the role's defaults.
const CUSTOMER_ADMIN_FLAGS = {
  can_place_orders: true,
  can_view_all_company_orders: true,
  can_manage_team: true,
  can_manage_order_owners: true,
  can_view_invoices: true,
  can_make_payments: true,
} as const

export type ErpInvite = {
  inviteRef: string
  customerCode: string
  customerName: string
  email: string
  firstName: string
  lastName: string
}

export type ErpInviteResult =
  | { ok: true; status: 'sent' | 'resent' | 'already_accepted'; inviteId: string }
  | { ok: false; error: string }

const expiry = () => new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

export async function acceptErpInvite(i: ErpInvite): Promise<ErpInviteResult> {
  const admin = createAdminClient()

  // ---- 1. The login shell for this ERP customer ----
  const { data: shell, error: findErr } = await admin
    .from('customers')
    .select('id, name')
    .eq('customer_code', i.customerCode)
    .maybeSingle()
  if (findErr) return { ok: false, error: `Customer lookup failed: ${findErr.message}` }

  let customerId = shell?.id as string | undefined
  if (!customerId) {
    const { data: made, error: makeErr } = await admin
      .from('customers')
      .insert({ customer_code: i.customerCode, name: i.customerName, status: 'active' })
      .select('id')
      .single()
    if (makeErr || !made) return { ok: false, error: `Could not create the customer: ${makeErr?.message ?? 'no row'}` }
    customerId = made.id as string
  } else if (shell?.name !== i.customerName) {
    const { error: nameErr } = await admin.from('customers').update({ name: i.customerName }).eq('id', customerId)
    if (nameErr) console.error('[acceptErpInvite] customer name update failed:', nameErr.message)
  }

  // ---- 2. This reference seen before? ----
  const { data: prior, error: priorErr } = await admin
    .from('pending_invites')
    .select('id, status, email')
    .eq('erp_invite_ref', i.inviteRef)
    .maybeSingle()
  if (priorErr) return { ok: false, error: `Invitation lookup failed: ${priorErr.message}` }

  if (prior) {
    if (prior.status === 'accepted') return { ok: true, status: 'already_accepted', inviteId: prior.id }
    if (prior.status !== 'pending') {
      return { ok: false, error: 'This invitation is closed in the Portal. Revoke it in Dia-Co and invite again.' }
    }
    if (String(prior.email).toLowerCase() !== i.email) {
      return { ok: false, error: 'This invitation reference belongs to a different email address.' }
    }
    // Supabase reuses the unconfirmed auth user and issues a fresh link.
    const resent = await sendInviteEmail(i.email)
    if (!resent.ok) return { ok: false, error: resent.error }
    const { error: bumpErr } = await admin
      .from('pending_invites')
      .update({ expires_at: expiry(), auth_user_id: resent.authUserId })
      .eq('id', prior.id)
    if (bumpErr) return { ok: false, error: `The email went out, but the invitation was not extended: ${bumpErr.message}` }
    return { ok: true, status: 'resent', inviteId: prior.id }
  }

  // ---- 3. A new invitation ----
  const sent = await sendInviteEmail(i.email)
  if (!sent.ok) return { ok: false, error: sent.error }

  const { data: inserted, error: insertErr } = await admin
    .from('pending_invites')
    .insert({
      email: i.email,
      first_name: i.firstName,
      last_name: i.lastName,
      role: 'customer_admin',
      invited_by_user_id: null,
      erp_invite_ref: i.inviteRef,
      customer_id: customerId,
      auth_user_id: sent.authUserId,
      ...CUSTOMER_ADMIN_FLAGS,
      expires_at: expiry(),
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    await deleteInvitedAuthUser(sent.authUserId, 'acceptErpInvite')
    if (insertErr?.code === '23505') {
      return { ok: false, error: 'An invitation is already pending for this email in the Portal.' }
    }
    return { ok: false, error: `Could not record the invitation: ${insertErr?.message ?? 'no row'}` }
  }
  return { ok: true, status: 'sent', inviteId: inserted.id as string }
}
