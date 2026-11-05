"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AnalyticsData = {
  currency: "BDT";
  summary: { totalOrders: number; totalOrderValue: number; paidOrderValue: number; unpaidCodValue: number; unpaidCodOrders: number; products: number; stockUnits: number };
  orderStatuses: { status: string; count: number }[];
  shipmentStatuses: { status: string; count: number }[];
  salesTrend: { date: string; label: string; orders: number; sales: number }[];
  topProducts: { name: string; units: number; sales: number }[];
  recentOrders: { id: string; orderNumber: string; status: string; paymentStatus: string; total: number; createdAt: string; customerName: string }[];
};

const money = (value: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(value);
const pretty = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AnalyticsDashboard({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/analytics?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load analytics.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);
  useEffect(() => { void load(); }, [load]);

  const maxSales = useMemo(() => Math.max(1, ...(data?.salesTrend.map((day) => day.sales) || [1])), [data]);
  const maxProductUnits = useMemo(() => Math.max(1, ...(data?.topProducts.map((product) => product.units) || [1])), [data]);

  if (loading) return <section className="analytics-state">Loading your business overview…</section>;
  if (error) return <section className="analytics-state analytics-error"><strong>Analytics could not be loaded</strong><p>{error}</p><button onClick={load}>Try again</button></section>;
  if (!data) return null;

  const statCards = [
    { label: "Total orders", value: data.summary.totalOrders.toLocaleString("en-BD"), note: "All-time, excluding no statuses" },
    { label: "Order value", value: money(data.summary.totalOrderValue), note: "Excludes cancelled and returned" },
    { label: "Paid order value", value: money(data.summary.paidOrderValue), note: "Orders marked fully paid" },
    { label: "Unpaid COD value", value: money(data.summary.unpaidCodValue), note: `${data.summary.unpaidCodOrders} unpaid / partial COD orders` },
  ];

  return (
    <section className="analytics-dashboard">
      <div className="analytics-title-row"><div><span className="analytics-eyebrow">BUSINESS OVERVIEW</span><h2>Store performance</h2><p>Live figures from this workspace database. Sales trend covers the last 14 days.</p></div><button className="analytics-refresh" onClick={load}>↻ Refresh data</button></div>
      <div className="analytics-stat-grid">{statCards.map((card) => <article className="analytics-stat" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></article>)}</div>
      <div className="analytics-chart-grid">
        <article className="analytics-panel analytics-trend-panel"><div className="analytics-panel-head"><div><h3>Sales trend</h3><p>Order value by day · BDT</p></div><span>14 DAYS</span></div>
          {data.salesTrend.every((day) => day.sales === 0) ? <div className="analytics-empty">No sales activity in this period yet.</div> : <div className="analytics-bars">{data.salesTrend.map((day) => <div className="analytics-bar-col" key={day.date} title={`${day.label}: ${money(day.sales)} · ${day.orders} orders`}><div className="analytics-bar-track"><div className="analytics-bar" style={{ height: `${Math.max(day.sales > 0 ? 4 : 0, day.sales / maxSales * 100)}%` }} /></div><small>{day.label}</small></div>)}</div>}
        </article>
        <article className="analytics-panel"><div className="analytics-panel-head"><div><h3>Order status</h3><p>Current order pipeline</p></div></div>
          <div className="analytics-status-list">{data.orderStatuses.length ? data.orderStatuses.map((item) => <div key={item.status}><span>{pretty(item.status)}</span><strong>{item.count}</strong></div>) : <div className="analytics-empty">No orders yet.</div>}</div>
          <div className="analytics-stock-strip"><div><span>Products</span><strong>{data.summary.products}</strong></div><div><span>Units in stock</span><strong>{data.summary.stockUnits.toLocaleString("en-BD")}</strong></div></div>
        </article>
      </div>
      <div className="analytics-lower-grid">
        <article className="analytics-panel"><div className="analytics-panel-head"><div><h3>Top-selling products</h3><p>By units in non-cancelled orders</p></div><Link href="/dashboard/products">View products →</Link></div>
          {data.topProducts.length ? <div className="analytics-product-list">{data.topProducts.map((product) => <div className="analytics-product" key={product.name}><div className="analytics-product-info"><strong>{product.name}</strong><small>{product.units} units · {money(product.sales)}</small></div><div className="analytics-product-track"><span style={{ width: `${product.units / maxProductUnits * 100}%` }} /></div></div>)}</div> : <div className="analytics-empty">Product sales will appear here after orders are placed.</div>}
        </article>
        <article className="analytics-panel"><div className="analytics-panel-head"><div><h3>Fulfillment status</h3><p>Courier shipment progress</p></div><Link href="/dashboard/courier">Open courier →</Link></div>
          {data.shipmentStatuses.length ? <div className="analytics-status-list">{data.shipmentStatuses.map((item) => <div key={item.status}><span>{pretty(item.status)}</span><strong>{item.count}</strong></div>)}</div> : <div className="analytics-empty">No shipment records yet.</div>}
        </article>
      </div>
      <article className="analytics-panel analytics-recent-panel"><div className="analytics-panel-head"><div><h3>Recent orders</h3><p>Latest orders from your store</p></div><Link href="/dashboard/orders">View all orders →</Link></div>
        {data.recentOrders.length ? <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order.id}><td><Link href={`/dashboard/orders/${order.id}`}>{order.orderNumber}</Link></td><td>{order.customerName}</td><td>{new Date(order.createdAt).toLocaleDateString("en-GB")}</td><td><span className="analytics-pill">{pretty(order.status)}</span></td><td>{pretty(order.paymentStatus)}</td><td>{money(order.total)}</td></tr>)}</tbody></table></div> : <div className="analytics-empty">No orders have been placed yet. <Link href="/dashboard/orders">Create your first order →</Link></div>}
      </article>
      <p className="analytics-footnote">Note: COD outstanding is the full total of unpaid or partially paid COD orders. A partial payment amount is not yet separately recorded in the payment ledger.</p>
    </section>
  );
}
