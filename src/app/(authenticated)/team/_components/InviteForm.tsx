"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createInvite,
  type CapabilityFlags,
  type InviteRole,
} from "@/lib/team/createInvite"

// Role defaults per PROJECT_CONTEXT §16. Applied when the user changes the
// role radio — user can override individual flags after.
const ROLE_DEFAULTS: Record<InviteRole, CapabilityFlags> = {
  sales_rep: {
    can_place_orders: true,
    can_view_all_company_orders: true,
    can_manage_team: false,
    can_view_invoices: false,
    can_make_payments: false,
    can_manage_order_owners: false,
  },
  customer_admin: {
    can_place_orders: true,
    can_view_all_company_orders: true,
    can_manage_team: true,
    can_view_invoices: true,
    can_make_payments: true,
    can_manage_order_owners: true,
  },
}

// Display labels for the 6 capability flags. Order matches the columns in
// the DB + createInvite's CapabilityFlags type.
const FLAG_ORDER: Array<keyof CapabilityFlags> = [
  "can_place_orders",
  "can_view_all_company_orders",
  "can_manage_team",
  "can_view_invoices",
  "can_make_payments",
  "can_manage_order_owners",
]

const FLAG_LABELS: Record<keyof CapabilityFlags, string> = {
  can_place_orders: "Place orders",
  can_view_all_company_orders: "View all company orders",
  can_manage_team: "Manage team",
  can_view_invoices: "View invoices",
  can_make_payments: "Make payments",
  can_manage_order_owners: "Manage order owners",
}

export function InviteForm() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<InviteRole>("sales_rep")
  const [flags, setFlags] = useState<CapabilityFlags>(ROLE_DEFAULTS.sales_rep)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRoleChange(newRole: InviteRole) {
    setRole(newRole)
    setFlags(ROLE_DEFAULTS[newRole])
  }

  function toggleFlag(flag: keyof CapabilityFlags) {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const capturedEmail = email
    startTransition(async () => {
      const result = await createInvite({
        email,
        firstName,
        lastName,
        role,
        flags,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Success: reset form, show banner, refresh so the pending list picks
      // up the new row from the server.
      setFirstName("")
      setLastName("")
      setEmail("")
      setRole("sales_rep")
      setFlags(ROLE_DEFAULTS.sales_rep)
      setSuccess(`Invitation sent to ${capturedEmail}`)
      router.refresh()
      // Auto-dismiss the banner after 5s.
      setTimeout(() => setSuccess(null), 5000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="team-invite-form">
      {success && (
        <div className="team-banner team-banner--success" role="status">
          {success}
        </div>
      )}
      {error && (
        <div className="team-banner team-banner--error" role="alert">
          {error}
        </div>
      )}

      <div className="team-invite-form__row team-invite-form__row--split">
        <label className="team-invite-form__field">
          <span className="team-invite-form__label">First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={isPending}
            className="team-invite-form__input"
          />
        </label>
        <label className="team-invite-form__field">
          <span className="team-invite-form__label">Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={isPending}
            className="team-invite-form__input"
          />
        </label>
      </div>

      <label className="team-invite-form__field">
        <span className="team-invite-form__label">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          className="team-invite-form__input"
        />
      </label>

      <fieldset className="team-invite-form__fieldset">
        <legend className="team-invite-form__label">Role</legend>
        <div className="team-invite-form__radios">
          <label className="team-invite-form__radio">
            <input
              type="radio"
              name="role"
              value="sales_rep"
              checked={role === "sales_rep"}
              onChange={() => handleRoleChange("sales_rep")}
              disabled={isPending}
            />
            <span>Sales Rep</span>
          </label>
          <label className="team-invite-form__radio">
            <input
              type="radio"
              name="role"
              value="customer_admin"
              checked={role === "customer_admin"}
              onChange={() => handleRoleChange("customer_admin")}
              disabled={isPending}
            />
            <span>Customer Admin</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="team-invite-form__fieldset">
        <legend className="team-invite-form__label">Permissions</legend>
        <div className="team-invite-form__flags">
          {FLAG_ORDER.map((flag) => (
            <label key={flag} className="team-invite-form__flag">
              <input
                type="checkbox"
                checked={flags[flag]}
                onChange={() => toggleFlag(flag)}
                disabled={isPending}
              />
              <span>{FLAG_LABELS[flag]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="team-invite-form__submit"
      >
        {isPending ? "Sending…" : "Send invitation"}
      </button>
    </form>
  )
}
