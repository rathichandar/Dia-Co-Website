// ============================================================
// CustomerAndDropShip
// Two columns: customer account (left) + drop ship recipient (right).
// ============================================================

import type { Order, Customer } from "@/types/order"
import { Collapsible } from "./Collapsible"

interface CustomerAndDropShipProps {
  order: Order
  customer: Customer
}

export function CustomerAndDropShip({
  order,
  customer,
}: CustomerAndDropShipProps) {
  return (
    <Collapsible
      title="Customer & drop ship"
      count={order.shipping.recipientName ?? null}
      defaultOpen={false}
    >
      <div className="kv-two">
        <div>
          <div
            className="key-spec__k"
            style={{ marginBottom: 10 }}
          >
            Your account
          </div>
          <div className="kv-grid">
            <div className="k">Company</div>
            <div className="v">{customer.companyName}</div>
            <div className="k">Contact</div>
            <div className="v">{customer.contactName}</div>
            <div className="k">Email</div>
            <div className="v">{customer.email || "—"}</div>
            <div className="k">Phone</div>
            <div className="v">{customer.phone}</div>
            <div className="k">Address</div>
            <div className="v">
              {customer.address.line1}
              {customer.address.line2 && (
                <>
                  <br />
                  {customer.address.line2}
                </>
              )}
              <br />
              {customer.address.city}, {customer.address.state}{" "}
              {customer.address.zip}
              <br />
              {customer.address.country}
            </div>
          </div>
        </div>

        <div>
          <div
            className="key-spec__k"
            style={{ marginBottom: 10 }}
          >
            {order.shipping.type === "drop_ship_to_customer"
              ? "Drop ship to"
              : "Ship to"}
          </div>
          <div className="kv-grid">
            {order.shipping.recipientName && (
              <>
                <div className="k">Recipient</div>
                <div className="v">{order.shipping.recipientName}</div>
              </>
            )}
            {order.shipping.phone && (
              <>
                <div className="k">Phone</div>
                <div className="v">{order.shipping.phone}</div>
              </>
            )}
            {order.shipping.address && (
              <>
                <div className="k">Address</div>
                <div className="v">
                  {order.shipping.address.line1}
                  {order.shipping.address.line2 && (
                    <>
                      <br />
                      {order.shipping.address.line2}
                    </>
                  )}
                  <br />
                  {order.shipping.address.city}, {order.shipping.address.state}{" "}
                  {order.shipping.address.zip}
                  <br />
                  {order.shipping.address.country}
                </div>
              </>
            )}
            <div className="k">Insured for</div>
            <div className="v">
              ${order.shipping.insuredAmount.toLocaleString("en-US")}
              {order.shipping.carrier && (
                <span className="sub">
                  Via {order.shipping.carrier.toUpperCase()}
                </span>
              )}
              {order.shipping.trackingNumber && (
                <span className="sub">
                  Tracking: {order.shipping.trackingNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Collapsible>
  )
}
