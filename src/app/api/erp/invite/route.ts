import { acceptErpInvite } from '@/lib/erp/acceptErpInvite'
import { erpReply, readSignedErpRequest, str, UUID_RE } from '@/lib/erp/erpRequest'

// POST /api/erp/invite — the ERP's Customer Master invites a customer's first Customer Admin
// (ERP_INTEGRATION_CONTRACT.md §9). POST only: a GET with a side effect is the logout-prefetch lesson.
// Body: { invite_ref, customer_code, customer_name, email, first_name, last_name, role: "customer_admin" }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const signed = await readSignedErpRequest(req)
  if (!signed.ok) return signed.response
  const b = signed.body

  const invite = {
    inviteRef: str(b, 'invite_ref'),
    customerCode: str(b, 'customer_code'),
    customerName: str(b, 'customer_name'),
    email: str(b, 'email').toLowerCase(),
    firstName: str(b, 'first_name'),
    lastName: str(b, 'last_name'),
  }
  if (!UUID_RE.test(invite.inviteRef) || !invite.customerCode || !invite.customerName
      || !EMAIL_RE.test(invite.email) || !invite.firstName || !invite.lastName) {
    return erpReply(422, { ok: false, code: 'PORTAL_INVALID', message: 'The invitation is missing a field or has a malformed one.' })
  }
  if (str(b, 'role') !== 'customer_admin') {
    return erpReply(422, { ok: false, code: 'PORTAL_INVALID', message: 'Only a Customer Admin is invited from Dia-Co.' })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return erpReply(503, { ok: false, code: 'PORTAL_NOT_CONFIGURED', message: 'The Portal cannot send invitations: its service key is not set.' })
  }

  const res = await acceptErpInvite(invite)
  return res.ok
    ? erpReply(200, { ok: true, status: res.status, invite_id: res.inviteId })
    : erpReply(422, { ok: false, code: 'PORTAL_NOT_SENT', message: res.error })
}
