// Next.js 16 proxy (formerly "middleware"). Runs before every matched request.
// Two responsibilities:
//   1. Refresh the Supabase auth session (via updateSession helper).
//   2. Gate authenticated routes — anonymous traffic to a non-public path
//      gets redirected to /login?redirectTo=<original-path>.
//
// The matcher excludes static assets so we don't burn this on every PNG fetch.

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { sanitizeRedirectTo } from '@/lib/auth/redirect'

// Public routes — accessible without a session.
// /auth/callback handles the PKCE code exchange for password reset + magic links.
// /auth/confirm is where server-sent email links (invites) verify their token.
// /api/erp/* are the ERP's machine-to-machine routes: no user session, each request
// must carry the ERP's signature (src/lib/erp/erpRequest.ts) or it is refused.
const PUBLIC_PREFIXES = [
  '/login',
  '/logout',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/api/erp',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const { response, user } = await updateSession(request, {
    allowDevAutoLogin: !isPublicPath(pathname),
  })

  if (user || isPublicPath(pathname)) {
    return response
  }

  // Anonymous traffic to a protected route. Stash the original path in
  // ?redirectTo for round-trip restoration after sign-in. sanitizeRedirectTo
  // guards against weird rewrites; the typical case is "/orders" or "/orders/DG-10001".
  //
  // CRITICAL: copy cookies from `response` (which updateSession's setAll
  // callback may have populated with refreshed or invalidated session
  // cookies) onto the redirect response before returning. NextResponse.redirect()
  // creates a fresh response — without this copy, any Set-Cookie headers that
  // supabase-ssr queued during getUser() silently vanish. That was the
  // Sub-session 4 prod cookie persistence bug: getUser() invalidated the stale
  // session and queued clear-cookie writes on `response`, the proxy then threw
  // them away by returning a bare redirect, the browser kept the (now-stale)
  // cookies, the next request looped through the same dead path.
  const target = sanitizeRedirectTo(pathname + search)
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirectTo', target)
  const redirect = NextResponse.redirect(loginUrl)
  response.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value, c)
  })
  return redirect
}

export const config = {
  // Run on everything EXCEPT Next internals + common static asset extensions.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
}
