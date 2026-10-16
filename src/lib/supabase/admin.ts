import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client — SS5 re-introduction after SS4's src/ purge.
//
// RESERVED USE: supabase.auth.admin.* calls only (inviteUserByEmail,
// deleteUser, getUserById). These physically require the service_role key —
// there is no alternative. Every other call in the app goes through the
// cookie-bound client in ./server.ts, which enforces RLS.
//
// SS5 convention (locked with Arpit):
//   1. Cookie-bound client validates the caller's identity + does the
//      RLS-protected DB writes.
//   2. Admin client is used ONLY within the .auth.admin.* namespace inside
//      that same Server Action.
//   3. The two clients never touch the same table. A bug that mixes them
//      = data leak across customers.
//
// ONE EXCEPTION (ERP integration Step 1): the signed machine routes under
// /api/erp/* (src/lib/erp/acceptErpInvite.ts, src/app/api/erp/link-revoke)
// write customers / pending_invites / user_profiles with this client. They have
// no signed-in user for RLS to act as; the ERP's request signature, verified
// before any read, is the caller's identity. Nothing else may follow suit.
//
// Session is not persisted / not auto-refreshed — this client is stateless
// and re-created per Server Action invocation. Multiple concurrent uses
// don't share cookies or sessions.

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
