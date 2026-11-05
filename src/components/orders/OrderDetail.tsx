"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Activity = { id: string; type: string; title: string; details: string | null; createdAt: string; actor: { name: string | null; email: string } | null };
type Item = { id: string; productName: string; sku: string | null; quantity: number; unitPrice: string | number; lineTotal: string | number };
type Order = {
  id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod: string;
  subtotal: string | number; discount: string | number; shippingCharge: string | number; total: string | number;
  customerName: string; customerPhone: string; shippingAddress: string; shippingCity: string | null;
  customerNote: string | null; internalNote: string | null; createdAt: string; updatedAt: string;
  items: Item[]; activities: Activity[]; customer: { name: string; email: string | null; segment: string } | null;
};
const money = (v: string | number) => `৳ ${Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const labels: Record<string,string> = { PENDING:"Pending", CONFIRMED:"Confirmed", PROCESSING:"Processing", SHIPPED:"Shipped", DELIVERED:"Delivered", CANCELLED:"Cancelled", RETURNED:"Returned" };
const paymentLabels: Record<string,string> = { UNPAID:"Unpaid", PAID:"Paid", PARTIAL:"Partial", REFUNDED:"Refunded" };

export function OrderDetail({ tenantId, orderId }: { tenantId: string; orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/detail?tenantId=${encodeURIComponent(tenantId)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load this order.");
      setOrder(result.order);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load order."); }
    finally { setLoading(false); }
  }, [tenantId, orderId]);
  useEffect(() => { void load(); }, [load]);

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/detail`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save note.");
      setNote(""); setNotice("Internal note added to the activity timeline."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save note."); }
    finally { setSaving(false); }
  }

  return <main className="simple-page"><div className="wrap order-detail-page">
    <Link className="text-link" href="/dashboard/orders">← Back to orders</Link>
    {loading ? <p className="catalog-empty">Loading order details...</p> : !order ? <><h1>Order unavailable</h1>{error && <p className="auth-error" role="alert">{error}</p>}</> : <>
      <div className="order-detail-heading"><div><span className="eyebrow">ORDER DETAILS</span><h1>{order.orderNumber}</h1><p className="lead">Created {new Date(order.createdAt).toLocaleString("en-BD", { dateStyle:"long", timeStyle:"short" })}</p></div><span className={`order-status status-${order.status.toLowerCase()}`}>{labels[order.status] || order.status}</span></div>
      <div className="order-detail-grid">
        <section className="catalog-panel order-detail-main">
          <div className="catalog-panel-heading"><div><span className="eyebrow">PURCHASE SUMMARY</span><h2>Items & totals</h2></div></div>
          <div className="order-detail-items">{order.items.map(item => <div className="order-detail-item" key={item.id}><div><strong>{item.productName}</strong><small>{item.sku || "No SKU"} · Qty {item.quantity} · {money(item.unitPrice)} each</small></div><b>{money(item.lineTotal)}</b></div>)}</div>
          <div className="order-detail-totals"><div><span>Subtotal</span><b>{money(order.subtotal)}</b></div><div><span>Discount</span><b>− {money(order.discount)}</b></div><div><span>Shipping</span><b>{money(order.shippingCharge)}</b></div><div className="order-grand-total"><span>Total payable</span><strong>{money(order.total)}</strong></div></div>
        </section>
        <div className="order-detail-side">
          <section className="catalog-panel"><span className="eyebrow">CUSTOMER & DELIVERY</span><h2>{order.customerName}</h2><p className="order-detail-contact">{order.customerPhone}</p>{order.customer?.email && <p className="order-detail-contact">{order.customer.email}</p>}<div className="order-detail-address">{order.shippingAddress}{order.shippingCity ? `, ${order.shippingCity}` : ""}</div>{order.customer?.segment && <small className="order-detail-muted">Customer segment: {order.customer.segment}</small>}</section>
          <section className="catalog-panel"><span className="eyebrow">PAYMENT</span><h2>{paymentLabels[order.paymentStatus] || order.paymentStatus}</h2><p className="order-detail-contact">Method: {order.paymentMethod.replaceAll("_"," ")}</p><p className="order-detail-contact">Currency: BDT (৳)</p></section>
          {order.customerNote && <section className="catalog-panel"><span className="eyebrow">CUSTOMER NOTE</span><p className="order-detail-note">{order.customerNote}</p></section>}
        </div>
      </div>
      <section className="catalog-panel order-activity-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">AUDITABLE ORDER HISTORY</span><h2>Activity timeline</h2></div><button type="button" className="catalog-refresh" onClick={() => void load()}>Refresh</button></div>
        <form className="order-note-form" onSubmit={addNote}><label htmlFor="order-internal-note">Add an internal note</label><textarea id="order-internal-note" rows={3} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Only your workspace team can see this note..." required /><button className="button button-dark" type="submit" disabled={saving || !note.trim()}>{saving ? "Saving..." : "Add internal note"}</button></form>
        {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="catalog-notice" role="status">{notice}</p>}
        {order.activities.length ? <div className="order-timeline">{order.activities.map(activity => <article className="order-timeline-entry" key={activity.id}><span className={`order-timeline-dot timeline-${activity.type.toLowerCase()}`}></span><div><strong>{activity.title}</strong>{activity.details && <p>{activity.details}</p>}<small>{new Date(activity.createdAt).toLocaleString("en-BD", { dateStyle:"medium", timeStyle:"short" })} · {activity.actor?.name || activity.actor?.email || "System"}</small></div></article>)}</div> : <p className="catalog-empty">No activity has been recorded yet.</p>}
      </section>
    </>}
  </div></main>;
}
