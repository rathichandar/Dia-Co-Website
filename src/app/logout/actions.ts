'use server'

// ============================================================
// logoutAction Server Action — Phase 2C Sub-session 4 cookie-bug fix.
//
// Replaces the old GET /logout route handler. Reason: Next.js Link
// components prefetch by default on hover, and the TopNav's "Logout"
// link was triggering the GET handler as a prefetch — which called
// supabase.auth.signOut() and queued a clear-cookie write. The
// browser honored the clear-cookie from the prefetch response,
// dropping the session. Every subsequent navigation bounced back
// to /login because the session was gone.
//
// Prefetches are always GET. By moving logout to a Server Action
// (invoked via form POST), prefetch can't trigger it. Only an
// explicit user click on the button fires the action.
//
// Form-submit pattern from TopNav:
//   <form action={logoutAction}>
//     <button type="submit">Logout</button>
//   </form>
// ============================================================

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Same flush-cookies-before-redirect pattern as loginAction (Phase 2C
  // Sub-session 4 commit aa47bc8). Ensures the Set-Cookie clears reach
  // the browser through Next's X-Action-Redirect protocol.
  revalidatePath('/', 'layout')

  redirect('/login')
}
