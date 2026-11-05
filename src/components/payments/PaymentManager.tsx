"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PaymentData = {
  summary: { orderValue: number; collectedNet: number; balanceDue: number; codOutstanding: number; codOrders: number; paymentTransactions: number; grossCollections: number; refunds: number };
  codOrders: { id: string; orderNumber: string; customerName: string; customerPhone: string; total: number; amountPaid: number; balanceDue: number; createdAt: string }[];
  recentTransactions: { id: string; type: string; amount: number; method: string; reference: string | null; note: string | null; createdAt: string; order: { id: string; orderNumber: string; customerName: string } }[];
};
const money = (value: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 }).format(value);
const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

export default function PaymentManager({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/payments?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load payments.");
      setData(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load payments."); }
    finally { setLoading(false); }
  }, [tenantId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="payment-page-state">Loading payment records…</div>;
  if (error) return <div className="payment-page-state payment-page-error"><strong>Payment overview unavailable</strong><p>{error}</p><button onClick={load}>Try again</button></div>;
  if (!data) return null;
  const cards = [
    ["Order value", money(data.summary.orderValue), "Orders excluding cancelled and returned"],
    ["Net collected", money(data.summary.collectedNet), "Payments less recorded refunds"],
    ["Total balance due", money(data.summary.balanceDue), "Outstanding across active orders"],
    ["COD outstanding", money(data.summary.codOutstanding), `${data.summary.codOrders} unpaid or partial COD orders`],
    ["Gross collections", money(data.summary.grossCollections), "All recorded incoming transactions"],
    ["Refunds", money(data.summary.refunds), "All recorded refund transactions"],
  ];
  return <main className="simple-page"><div className="wrap payment-page">
    <div className="payment-page-heading"><div><span className="eyebrow">FINANCE & COLLECTIONS</span><h1>Payments & COD</h1><p>Track money collected, outstanding balances and refunds for this workspace.</p></div><button className="catalog-refresh" onClick={load}>↻ Refresh</button></div>
    <div className="payment-summary-grid">{cards.map(([title,value,note])=><article key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small></article>)}</div>
    <section className="catalog-panel payment-page-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">CASH ON DELIVERY</span><h2>COD collection due</h2></div></div>
      {data.codOrders.length ? <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Order</th><th>Customer</th><th>Order total</th><th>Collected</th><th>Balance due</th><th>Action</th></tr></thead><tbody>{data.codOrders.map(order=><tr key={order.id}><td><Link href={`/dashboard/orders/${order.id}`}>{order.orderNumber}</Link></td><td>{order.customerName}<small>{order.customerPhone}</small></td><td>{money(order.total)}</td><td>{money(order.amountPaid)}</td><td><strong>{money(order.balanceDue)}</strong></td><td><Link href={`/dashboard/orders/${order.id}`}>Record payment →</Link></td></tr>)}</tbody></table></div> : <p className="catalog-empty">No outstanding COD balances. Great work.</p>}
    </section>
    <section className="catalog-panel payment-page-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">TRANSACTION HISTORY</span><h2>Recent payments & refunds</h2></div><span className="payment-count">{data.summary.paymentTransactions} incoming payments</span></div>
      {data.recentTransactions.length ? <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Method</th><th>Reference</th><th>Amount</th><th>Date</th></tr></thead><tbody>{data.recentTransactions.map(item=><tr key={item.id}><td><Link href={`/dashboard/orders/${item.order.id}`}>{item.order.orderNumber}</Link></td><td>{item.order.customerName}</td><td>{label(item.type)}</td><td>{label(item.method)}</td><td>{item.reference || "—"}</td><td><strong className={item.type === "PAYMENT" ? "payment-credit" : "payment-debit"}>{item.type === "PAYMENT" ? "+" : "−"}{money(item.amount)}</strong></td><td>{new Date(item.createdAt).toLocaleDateString("en-GB")}</td></tr>)}</tbody></table></div> : <p className="catalog-empty">No payment transactions recorded yet. Open an order to record a collection or refund.</p>}
    </section>
    <p className="analytics-footnote">This ledger records transactions entered by your team. It does not connect to a bank, card processor or courier settlement API, and it does not independently verify that money was received.</p>
  </div></main>;
}
