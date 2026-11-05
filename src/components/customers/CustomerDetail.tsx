"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type CustomerOrder = {
  id: string; orderNumber: string; status: string; paymentStatus: string; total: string | number; createdAt: string;
  items: { id: string; productName: string; quantity: number; lineTotal: string | number }[];
};
type Customer = {
  id: string; name: string; phone: string | null; email: string | null; address: string | null; city: string | null;
  notes: string | null; segment: string; createdAt: string;
  purchaseSummary: { orderCount: number; lifetimeOrderValue: number; deliveredOrders: number; latestOrderAt: string | null };
  orders: CustomerOrder[];
};
const money = (value: string | number) => `৳ ${Number(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusLabel: Record<string,string> = { PENDING:"Pending", CONFIRMED:"Confirmed", PROCESSING:"Processing", SHIPPED:"Shipped", DELIVERED:"Delivered", CANCELLED:"Cancelled", RETURNED:"Returned" };

export function CustomerDetail({ tenantId, customerId }: { tenantId: string; customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}?tenantId=${encodeURIComponent(tenantId)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load customer.");
      setCustomer(result.customer);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load customer."); }
    finally { setLoading(false); }
  }, [tenantId, customerId]);
  useEffect(() => { void load(); }, [load]);

  return <main className="simple-page"><div className="wrap customer-detail-page">
    <Link className="text-link" href="/dashboard/customers">← Back to customers</Link>
    {loading ? <p className="catalog-empty">Loading customer profile...</p> : !customer ? <><h1>Customer unavailable</h1><p className="auth-error" role="alert">{error || "This customer could not be found in the current workspace."}</p></> : <>
      <div className="customer-detail-heading"><div><span className="eyebrow">CUSTOMER PROFILE</span><h1>{customer.name}</h1><p className="lead">Customer since {new Date(customer.createdAt).toLocaleDateString("en-BD", { dateStyle:"long" })}</p></div><span className={`customer-segment segment-${customer.segment.toLowerCase()}`}>{customer.segment}</span></div>
      <section className="customer-purchase-stats">
        <article><span>Lifetime order value</span><strong>{money(customer.purchaseSummary.lifetimeOrderValue)}</strong><small>All orders except cancelled and returned</small></article>
        <article><span>Orders</span><strong>{customer.purchaseSummary.orderCount}</strong><small>Valid orders in this workspace</small></article>
        <article><span>Delivered</span><strong>{customer.purchaseSummary.deliveredOrders}</strong><small>Successfully delivered orders</small></article>
        <article><span>Latest order</span><strong>{customer.purchaseSummary.latestOrderAt ? new Date(customer.purchaseSummary.latestOrderAt).toLocaleDateString("en-BD") : "—"}</strong><small>Most recent valid order</small></article>
      </section>
      <div className="customer-detail-grid">
        <section className="catalog-panel"><span className="eyebrow">CONTACT INFORMATION</span><h2>Customer details</h2><div className="customer-detail-info"><span>Phone</span><strong>{customer.phone || "Not provided"}</strong><span>Email</span><strong>{customer.email || "Not provided"}</strong><span>City</span><strong>{customer.city || "Not provided"}</strong><span>Address</span><strong>{customer.address || "Not provided"}</strong></div>{customer.notes && <div className="customer-detail-notes"><span className="eyebrow">INTERNAL NOTES</span><p>{customer.notes}</p></div>}</section>
        <section className="catalog-panel customer-orders-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">PURCHASE HISTORY</span><h2>Order history</h2></div><button type="button" className="catalog-refresh" onClick={() => void load()}>Refresh</button></div>
          {customer.orders.length ? <div className="customer-order-list">{customer.orders.map(order => <article className="customer-order-row" key={order.id}><div><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString("en-BD", { dateStyle:"medium", timeStyle:"short" })} · {order.items.length} line items</small><small>{order.items.map(item => `${item.productName} × ${item.quantity}`).join(" · ")}</small></div><div className="customer-order-value"><b>{money(order.total)}</b><span className={`order-status status-${order.status.toLowerCase()}`}>{statusLabel[order.status] || order.status}</span></div><Link className="text-link" href={`/dashboard/orders/${order.id}`}>View order →</Link></article>)}</div> : <p className="catalog-empty">No orders are linked to this customer yet. Link this customer when creating an order to build purchase history.</p>}
        </section>
      </div>
    </>}
  </div></main>;
}
