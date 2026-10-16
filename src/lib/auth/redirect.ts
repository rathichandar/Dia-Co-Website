// Shared redirect-target sanitizer.
//
// Used by:
//   - src/proxy.ts (when building the login URL's ?redirectTo)
//   - src/app/login/actions.ts (when consuming ?redirectTo on submit)
//   - src/app/reset-password/actions.ts (post-update redirect)
//
// Rules: only accept values that start with "/" AND do not start with "//".
// Protects against open-redirect attacks like /login?redirectTo=//evil.com
// which would otherwise resolve to a protocol-relative external URL.
//
// The prefix checks alone are not enough: browsers' URL parser treats "\" as
// "/" and drops tabs/newlines, so "/\evil.com" or "/<TAB>/evil.com" passed and
// resolved to http://evil.com/. So we also resolve the value with the same
// WHATWG parser against a placeholder origin and require the origin to be
// unchanged, returning the parsed path rather than the raw string.

export const DEFAULT_AUTHENTICATED_HOME = '/orders'

const PLACEHOLDER_ORIGIN = 'http://placeholder.invalid'

export function sanitizeRedirectTo(value: string | null | undefined): string {
  if (!value) return DEFAULT_AUTHENTICATED_HOME
  if (!value.startsWith('/')) return DEFAULT_AUTHENTICATED_HOME
  if (value.startsWith('//')) return DEFAULT_AUTHENTICATED_HOME

  let parsed: URL
  try {
    parsed = new URL(value, PLACEHOLDER_ORIGIN)
  } catch {
    return DEFAULT_AUTHENTICATED_HOME
  }
  if (parsed.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_AUTHENTICATED_HOME

  return parsed.pathname + parsed.search + parsed.hash
}
