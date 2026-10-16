// ============================================================
// /orders/new — Order entry form
//
// Server Component. Resolves the authenticated user's customer_id from
// their user_profiles row, fetches that customer + product_types +
// metals + stone tables, and renders the client form component.
//
// Phase 2C Sub-session 4: replaces the hardcoded customer + submitter
// UUIDs with auth-derived identity. The form's saveDraft + submitOrder
// actions read auth.uid() server-side (no submitterId prop needed).
// ============================================================

import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { NewOrderForm } from "@/components/orders/new/NewOrderForm"
import { createClient } from "@/lib/supabase/server"
import { fetchDraftForResume } from "@/lib/orders/fetchDraftForResume"

export const metadata: Metadata = {
  title: "New order · Dia-Co",
}

interface ProductTypeOption {
  id: string
  name: string
  short_code: string
}

interface NewOrderPageProps {
  searchParams: Promise<{
    // Step 7: presence triggers resume hydration. Absent → fresh form.
    orderId?: string
  }>
}

export default async function NewOrderPage({
  searchParams,
}: NewOrderPageProps) {
  const sp = await searchParams
  const supabase = await createClient()

  // Resolve the authenticated user's customer_id from their user_profiles
  // row. Proxy already gated unauthenticated access, so user should always
  // be present — defensive redirect to /login if not. Diaco staff
  // (am/ar/super_admin) have NULL customer_id by design; their order-
  // creation flow ships in Phase 2D. For now, customer-side users only.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?redirectTo=%2Forders%2Fnew")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("customer_id")
    .eq("id", user.id)
    .maybeSingle()

  const callerCustomerId = profile?.customer_id as string | null
  if (!callerCustomerId) {
    return (
      <div className="diaco-design">
        <div className="page-wrap">
          <div className="draft-error">
            <h1>Order creation unavailable</h1>
            <p>
              Your account isn&apos;t set up to place orders directly. Contact
              your account manager to place an order on your behalf.
            </p>
            <Link href="/orders" className="btn">
              Back to orders
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // If orderId is present, attempt resume hydration BEFORE the master
  // data fetch — failed resume short-circuits to an error page without
  // pulling the rest. Hydration result drives whether NewOrderForm
  // receives initialDraft or starts clean.
  const resumeResult = sp.orderId
    ? await fetchDraftForResume(sp.orderId)
    : null

  // Edge case: orderId given but draft doesn't exist (or belongs to
  // another customer — collapsed to not_found for privacy).
  if (resumeResult?.kind === "not_found") {
    return (
      <div className="diaco-design">
        <div className="page-wrap">
          <div className="draft-error">
            <h1>Draft not found</h1>
            <p>This draft no longer exists or has been deleted.</p>
            <Link href="/orders" className="btn">
              Back to orders
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Edge case: order exists for this customer but status ≠ 'draft' —
  // already submitted (designing, approved, etc.) and can't be edited.
  // CTA deep-links to the detail page where the customer can review.
  if (resumeResult?.kind === "wrong_status") {
    return (
      <div className="diaco-design">
        <div className="page-wrap">
          <div className="draft-error">
            <h1>Order already submitted</h1>
            <p>
              This order was submitted and can no longer be edited.
            </p>
            <Link
              href={`/orders/${resumeResult.orderId}`}
              className="btn"
            >
              View order
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const initialDraft =
    resumeResult?.kind === "ok" ? resumeResult.initialDraft : null

  // Fetch product_types + customer + metals + stone_types + stone_shapes
  // in parallel. Customer backs the Section 08 address preview, metals
  // backs Section 04, the two stone tables back Sections 05 + 06.
  const [
    productTypesRes,
    customerRes,
    metalsRes,
    stoneTypesRes,
    stoneShapesRes,
  ] = await Promise.all([
    supabase
      .from("product_types")
      .select("id, name, short_code")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("customers")
      .select(
        "id, name, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_postal_code, billing_country, phone",
      )
      .eq("id", callerCustomerId)
      .maybeSingle(),
    supabase
      .from("metals")
      .select("id, name, short_code")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("stone_types")
      .select("id, name, category")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("stone_shapes")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order"),
  ])

  if (productTypesRes.error) {
    console.error(
      "NewOrderPage: product_types fetch failed:",
      productTypesRes.error.message,
    )
  }
  if (customerRes.error) {
    console.error(
      "NewOrderPage: customer fetch failed:",
      customerRes.error.message,
    )
  }
  if (metalsRes.error) {
    console.error(
      "NewOrderPage: metals fetch failed:",
      metalsRes.error.message,
    )
  }
  if (stoneTypesRes.error) {
    console.error(
      "NewOrderPage: stone_types fetch failed:",
      stoneTypesRes.error.message,
    )
  }
  if (stoneShapesRes.error) {
    console.error(
      "NewOrderPage: stone_shapes fetch failed:",
      stoneShapesRes.error.message,
    )
  }

  const productTypes: ProductTypeOption[] = (productTypesRes.data ?? []).map(
    (p: { id: string; name: string; short_code: string }) => ({
      id: p.id,
      name: p.name,
      short_code: p.short_code,
    }),
  )

  const c = customerRes.data as
    | {
        id: string
        name: string
        billing_address_line1: string | null
        billing_address_line2: string | null
        billing_city: string | null
        billing_state: string | null
        billing_postal_code: string | null
        billing_country: string | null
        phone: string | null
      }
    | null

  const customer: CustomerForForm = c
    ? {
        id: c.id,
        name: c.name,
        billingAddressLine1: c.billing_address_line1,
        billingAddressLine2: c.billing_address_line2,
        billingCity: c.billing_city,
        billingState: c.billing_state,
        billingPostalCode: c.billing_postal_code,
        billingCountry: c.billing_country,
        phone: c.phone,
      }
    : {
        id: callerCustomerId,
        name: "Your account",
        billingAddressLine1: null,
        billingAddressLine2: null,
        billingCity: null,
        billingState: null,
        billingPostalCode: null,
        billingCountry: null,
        phone: null,
      }

  // Uppercase the "k" in karat labels per UI spec ("14k Yellow Gold" → "14K Yellow Gold").
  // Master data stays lowercase; this is display-only.
  const metals: MetalOption[] = (metalsRes.data ?? []).map(
    (m: { id: string; name: string; short_code: string | null }) => ({
      id: m.id,
      label: m.name.replace(/(\d+)k\s/, "$1K "),
      short_code: m.short_code,
    }),
  )

  const stoneTypes: StoneTypeOption[] = (stoneTypesRes.data ?? []).map(
    (s: { id: string; name: string; category: string }) => ({
      id: s.id,
      name: s.name,
      category: s.category as StoneTypeOption["category"],
    }),
  )

  const stoneShapes: StoneShapeOption[] = (stoneShapesRes.data ?? []).map(
    (s: { id: string; name: string }) => ({
      id: s.id,
      name: s.name,
    }),
  )

  return (
    <NewOrderForm
      customerId={callerCustomerId}
      productTypes={productTypes}
      customer={customer}
      metals={metals}
      stoneTypes={stoneTypes}
      stoneShapes={stoneShapes}
      initialDraft={initialDraft}
    />
  )
}

export interface StoneTypeOption {
  id: string
  name: string
  category: "natural_diamond" | "lab_diamond" | "color_stone"
}

export interface StoneShapeOption {
  id: string
  name: string
}

export interface MetalOption {
  id: string
  label: string
  short_code: string | null
}

export interface CustomerForForm {
  id: string
  name: string
  billingAddressLine1: string | null
  billingAddressLine2: string | null
  billingCity: string | null
  billingState: string | null
  billingPostalCode: string | null
  billingCountry: string | null
  phone: string | null
}
