// ============================================================
// Order Detail page
// Route: /orders/[orderId]
// e.g., /orders/DG-10001 → shows order DG-10001
//
// Server component for data loading + page metadata. The
// interactive two-column area is its own client component.
// ============================================================

import type { Metadata } from "next"
import { OrderHeader } from "@/components/orders/OrderHeader"
import { StageRibbon } from "@/components/orders/StageRibbon"
import { OrderDetailInteractive } from "@/components/orders/OrderDetailInteractive"
import { FullSpecifications } from "@/components/orders/FullSpecifications"
import { CustomerAndDropShip } from "@/components/orders/CustomerAndDropShip"
import { AllAttachments } from "@/components/orders/AllAttachments"
import { fetchOrder, fetchCustomerForOrder } from "@/lib/orders/fetchOrder"
import { notFound } from "next/navigation"
// diaco-design.css is loaded by src/app/(authenticated)/layout.tsx

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>
}

// Dynamic browser tab title per order
export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { orderId } = await params
  const order = await fetchOrder(orderId)
  if (!order) return { title: "Order not found · Dia-Co" }

  const title = order.poEndCustomerName
    ? `${order.poNumber} — ${order.poEndCustomerName} · Dia-Co`
    : `${order.poNumber} · Dia-Co`

  return { title }
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderId } = await params
  const order = await fetchOrder(orderId)

  if (!order) {
    notFound()
  }

  const ca = await fetchCustomerForOrder(orderId)
  if (!ca) {
    notFound()
  }
  const { customer, am } = ca

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
          <FullSpecifications order={order} />
          <CustomerAndDropShip order={order} customer={customer} />
          <AllAttachments order={order} />
        </div>
      </main>
    </div>
  )
}
