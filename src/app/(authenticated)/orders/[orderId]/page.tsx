// ============================================================
// Order Detail page
// Route: /orders/[orderId]
// e.g., /orders/DG-10001 → shows order DG-10001
//
// Server component for data loading + page metadata. The
// interactive two-column area is its own client component.
//
// ERP integration Step 2: for a login the ERP has linked to a
// customer, the order is read from the ERP first (the system of
// record); otherwise — or when the ERP has no such order — from the
// Portal's own tables, as before.
// ============================================================

import type { Metadata } from "next"
import { OrderHeader } from "@/components/orders/OrderHeader"
import { StageRibbon } from "@/components/orders/StageRibbon"
import { OrderDetailInteractive } from "@/components/orders/OrderDetailInteractive"
import { FullSpecifications } from "@/components/orders/FullSpecifications"
import { CustomerAndDropShip } from "@/components/orders/CustomerAndDropShip"
import { AllAttachments } from "@/components/orders/AllAttachments"
import { fetchOrder, fetchCustomerForOrder } from "@/lib/orders/fetchOrder"
import { fetchErpOrderPage } from "@/lib/erp/erpOrders"
import { fetchErpOrderInvoice, viewerCanSeeInvoices } from "@/lib/erp/erpInvoice"
import { ErpInvoiceCard } from "@/components/orders/ErpInvoiceCard"
import type { AccountManager, Customer, Order } from "@/types/order"
import { notFound } from "next/navigation"
// diaco-design.css is loaded by src/app/(authenticated)/layout.tsx

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>
}

async function loadOrderPage(
  orderId: string,
): Promise<{ order: Order; customer: Customer; am: AccountManager } | null> {
  const erp = await fetchErpOrderPage(orderId)
  if (erp?.kind === "found") return erp

  const order = await fetchOrder(orderId)
  if (!order) return null
  const ca = await fetchCustomerForOrder(orderId)
  if (!ca) return null
  return { order, customer: ca.customer, am: ca.am }
}

// Dynamic browser tab title per order
export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { orderId } = await params
  const page = await loadOrderPage(orderId)
  if (!page) return { title: "Order not found · Dia-Co" }
  const { order } = page

  const title = order.poEndCustomerName
    ? `${order.poNumber} — ${order.poEndCustomerName} · Dia-Co`
    : `${order.poNumber} · Dia-Co`

  return { title }
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderId } = await params
  const page = await loadOrderPage(orderId)

  if (!page) {
    notFound()
  }
  const { order, customer, am } = page
  // An ERP order carries no ship-to, insurance or attachments the Portal can show yet.
  const fromErp = order.source === "erp"
  // P1-09 — the invoice an ERP order is on, once it is invoiced (the ERP shows it as shipping), for a login with
  // "View invoices". Asked only then, so other orders and other logins cost no gateway call.
  const invoice =
    fromErp && order.portalStatus === "shipping" && (await viewerCanSeeInvoices())
      ? await fetchErpOrderInvoice(order.poNumber)
      : null

  return (
    <div className="diaco-design">
      <main className="page-wrap">
        <OrderHeader order={order} amName={am.name} />
        <StageRibbon order={order} />

        <OrderDetailInteractive
          order={order}
          customer={customer}
          am={am}
        />

        <div className="flex flex-col gap-3 mt-5">
          {invoice && <ErpInvoiceCard orderId={order.poNumber} invoice={invoice} />}
          <FullSpecifications order={order} />
          {!fromErp && <CustomerAndDropShip order={order} customer={customer} />}
          {!fromErp && <AllAttachments order={order} />}
        </div>
      </main>
    </div>
  )
}
