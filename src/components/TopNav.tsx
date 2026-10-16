"use client"

// ============================================================
// TopNav
// Top-of-page nav for authenticated pages. Now rendered from
// src/app/(authenticated)/layout.tsx (not the root layout) so it
// doesn't appear on /login, /forgot-password, /reset-password.
//
// Left:  Orders / History links
// Right: "+ New order" CTA, then user email + Logout
// ============================================================

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, LogOut } from "lucide-react"
import { logoutAction } from "@/app/logout/actions"

interface TopNavProps {
  // null when the layout couldn't resolve a user (shouldn't happen under
  // the proxy gate, but treated defensively so we never throw on missing data).
  userEmail: string | null
}

export function TopNav({ userEmail }: TopNavProps) {
  const pathname = usePathname() ?? "/"

  const isNewOrder = pathname.startsWith("/orders/new")
  const isHistory = pathname.startsWith("/history")
  // Anything else under /orders (list + detail) lights up Orders.
  const isOrders = !isHistory && !isNewOrder

  return (
    <div className="diaco-design top-nav-wrap">
      <nav className="top-nav" aria-label="Primary">
        <div className="top-nav__primary">
          <Link
            href="/orders"
            className={`top-nav__link ${isOrders ? "is-active" : ""}`}
          >
            Orders
          </Link>
          <Link
            href="/history"
            className={`top-nav__link ${isHistory ? "is-active" : ""}`}
          >
            History
          </Link>
        </div>
        <div className="top-nav__right">
          <Link
            href="/orders/new"
            className={`top-nav__cta ${isNewOrder ? "is-active" : ""}`}
          >
            <Plus size={14} /> New order
          </Link>
          {userEmail && (
            <div className="top-nav__user">
              <span className="top-nav__user-email" title={userEmail}>
                {userEmail}
              </span>
              {/*
                Form-submit (POST) rather than a Link (GET). Next.js Link
                prefetches on hover; a GET /logout endpoint would be hit by
                that prefetch and clear the session. Sub-session 4 prod
                cookie bug. Prefetches are always GET, so a POST-only
                logoutAction can't be triggered by them.
              */}
              <form action={logoutAction} className="top-nav__logout-form">
                <button type="submit" className="top-nav__logout">
                  <LogOut size={14} /> Logout
                </button>
              </form>
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
