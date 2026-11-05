"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; sku: string | null; price: string | number; stockQuantity: number };
type Customer = { id: string; name: string; phone: string | null; email: string | null; address: string | null; city: string | null };
type OrderItem = { id: string; productId: string | null; productName: string; sku: string | null; quantity: number; unitPrice: string | number; lineTotal: string | number };
type Order = { id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod: string; subtotal: string | number; discount: string | number; shippingCharge: string | number; total: string | number; customerName: string; customerPhone: string; shippingAddress: string; shippingCity: string | null; createdAt: string; items: OrderItem[] };
type Summary = { total: number; pending: number; delivered: number; orderValue: string | number };
type DraftItem = { productId: string; quantity: number };

const money = (value: string | number) => `৳ ${Number(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusLabel: Record<string, string> = { PENDING: "Pending", CONFIRMED: "Confirmed", PROCESSING: "Processing", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled", RETURNED: "Returned" };
const paymentLabel: Record<string, string> = { UNPAID: "Unpaid", PAID: "Paid", PARTIAL: "Partial", REFUNDED: "Refunded" };
const nextStatuses: Record<string, string[]> = { PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PROCESSING", "CANCELLED"], PROCESSING: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"], DELIVERED: ["RETURNED"], CANCELLED: [], RETURNED: [] };

export function OrderManager({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, pending: 0, delivered: 0, orderValue: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [items, setItems] = useState<DraftItem[]>([{ productId: "", quantity: 1 }]);
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const orderParams = new URLSearchParams({ tenantId });
      if (search.trim()) orderParams.set("search", search.trim());
      if (statusFilter !== "ALL") orderParams.set("status", statusFilter);
      const [orderResponse, productResponse, customerResponse] = await Promise.all([
        fetch(`/api/orders?${orderParams.toString()}`),
        fetch(`/api/products?tenantId=${encodeURIComponent(tenantId)}&pageSize=100`),
        fetch(`/api/customers?tenantId=${encodeURIComponent(tenantId)}`),
      ]);
      const [orderData, productData, customerData] = await Promise.all([orderResponse.json(), productResponse.json(), customerResponse.json()]);
      if (!orderResponse.ok) throw new Error(orderData.error || "Could not load orders.");
      if (!productResponse.ok) throw new Error(productData.error || "Could not load products.");
      if (!customerResponse.ok) throw new Error(customerData.error || "Could not load customers.");
      setOrders(orderData.orders || []);
      setSummary(orderData.summary || { total: 0, pending: 0, delivered: 0, orderValue: 0 });
      setProducts((productData.products || []).filter((product: Product & { status?: string }) => product.status === "ACTIVE" && product.stockQuantity > 0));
      setCustomers(customerData.customers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load order workspace.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const subtotal = useMemo(() => items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + (product ? Number(product.price) * item.quantity : 0);
  }, 0), [items, products]);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const selectedCustomer = customers.find((customer) => customer.id === customerId);
    const payload = {
      tenantId,
      customerId: customerId || undefined,
      customerName: String(form.get("customerName") || ""),
      customerPhone: String(form.get("customerPhone") || ""),
      shippingAddress: String(form.get("shippingAddress") || ""),
      shippingCity: String(form.get("shippingCity") || ""),
      customerNote: String(form.get("customerNote") || ""),
      paymentMethod: String(form.get("paymentMethod") || "COD"),
      discount: Number(form.get("discount") || 0),
      shippingCharge: Number(form.get("shippingCharge") || 0),
      items: items.filter((item) => item.productId && item.quantity > 0),
    };
    if (selectedCustomer && !payload.customerName) payload.customerName = selectedCustomer.name;
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create order.");
      (event.currentTarget as HTMLFormElement).reset();
      setCustomerId("");
      setItems([{ productId: "", quantity: 1 }]);
      setNotice(`Order ${result.order.orderNumber} created. Stock has been deducted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create order.");
    } finally {
      setSaving(false);
    }
  }

  async function updateOrder(order: Order, update: { status?: string; paymentStatus?: string }) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, ...update }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update order.");
      setNotice(`Order ${order.orderNumber} updated.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update order.");
    }
  }

  return (
    <div className="order-workspace">
      <section className="order-summary">
        <article><span>Total orders</span><strong>{summary.total}</strong></article>
        <article><span>Pending</span><strong>{summary.pending}</strong></article>
        <article><span>Delivered</span><strong>{summary.delivered}</strong></article>
        <article><span>Order value*</span><strong>{money(summary.orderValue)}</strong></article>
      </section>
      <div className="order-columns">
        <section className="catalog-panel order-create-panel">
          <div className="catalog-panel-heading"><div><span className="eyebrow">NEW CHECKOUT</span><h2>Create an order</h2></div></div>
          <form className="catalog-form" onSubmit={submit}>
            <label htmlFor="order-customer-select">Existing customer (optional)</label>
            <select id="order-customer-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Enter customer manually</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}
            </select>
            <label htmlFor="order-customer-name">Customer name</label><input id="order-customer-name" name="customerName" minLength={2} maxLength={120} defaultValue="" required />
            <label htmlFor="order-customer-phone">Phone</label><input id="order-customer-phone" name="customerPhone" minLength={5} maxLength={30} required placeholder="+880..." />
            <label htmlFor="order-shipping-address">Delivery address</label><textarea id="order-shipping-address" name="shippingAddress" rows={2} minLength={5} maxLength={500} required />
            <label htmlFor="order-city">City</label><input id="order-city" name="shippingCity" maxLength={100} placeholder="Dhaka" />
            <div className="order-items-heading"><strong>Order items</strong><button type="button" className="catalog-refresh" onClick={() => setItems((current) => [...current, { productId: "", quantity: 1 }])}>+ Add item</button></div>
            {items.map((item, index) => {
              const product = products.find((entry) => entry.id === item.productId);
              return <div className="order-item-editor" key={index}>
                <div><label htmlFor={`order-product-${index}`}>Product</label><select id={`order-product-${index}`} value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })} required><option value="">Select product</option>{products.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {money(entry.price)} · Stock {entry.stockQuantity}</option>)}</select></div>
                <div><label htmlFor={`order-quantity-${index}`}>Qty</label><input id={`order-quantity-${index}`} type="number" min="1" max={product?.stockQuantity || 100000} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} required /></div>
                {items.length > 1 && <button type="button" className="order-remove" aria-label="Remove item" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>×</button>}
                <small className="order-line-total">{product ? money(Number(product.price) * item.quantity) : "Choose a product"}</small>
              </div>;
            })}
            <div className="order-price-fields"><div><label htmlFor="order-discount">Discount (৳)</label><input id="order-discount" name="discount" type="number" min="0" step="0.01" defaultValue="0" /></div><div><label htmlFor="order-shipping">Shipping (৳)</label><input id="order-shipping" name="shippingCharge" type="number" min="0" step="0.01" defaultValue="0" /></div></div>
            <label htmlFor="order-payment-method">Payment method</label><select id="order-payment-method" name="paymentMethod" defaultValue="COD"><option value="COD">Cash on Delivery (COD)</option><option value="CASH">Cash</option><option value="MOBILE_BANKING">Mobile Banking</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="CARD">Card</option><option value="OTHER">Other</option></select>
            <label htmlFor="order-customer-note">Customer note (optional)</label><textarea id="order-customer-note" name="customerNote" rows={2} maxLength={1000} />
            <div className="order-total-preview"><span>Estimated subtotal</span><strong>{money(subtotal)}</strong></div>
            {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="catalog-notice" role="status">{notice}</p>}
            <button className="button button-dark" type="submit" disabled={saving || products.length === 0}>{saving ? "Creating order..." : "Create order & reserve stock"}</button>
            {products.length === 0 && <p className="form-note">No active products with available stock. Add products and stock before creating an order.</p>}
          </form>
        </section>
        <section className="catalog-panel order-list-panel">
          <div className="catalog-panel-heading"><div><span className="eyebrow">ORDER MANAGEMENT</span><h2>Recent orders</h2></div><button className="catalog-refresh" type="button" onClick={() => void load()}>Refresh</button></div>
          <div className="order-filters"><input aria-label="Search orders" placeholder="Search order, customer or phone..." value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Filter order status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          {loading ? <p className="catalog-empty">Loading orders...</p> : orders.length ? <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}>
            <div className="order-card-top"><div><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</small></div><strong>{money(order.total)}</strong></div>
            <div className="order-customer"><b>{order.customerName}</b><span>{order.customerPhone}</span></div>
            <div className="order-items-preview">{order.items.map((item) => <span key={item.id}>{item.productName} × {item.quantity}</span>)}</div>
            <div className="order-card-bottom"><span className={`order-status status-${order.status.toLowerCase()}`}>{statusLabel[order.status] || order.status}</span><span className="order-payment">{paymentLabel[order.paymentStatus] || order.paymentStatus} · {order.paymentMethod}</span></div>
            <div className="order-actions">
              {nextStatuses[order.status]?.length > 0 && <select aria-label={`Update status for ${order.orderNumber}`} defaultValue="" onChange={(event) => { if (event.target.value) void updateOrder(order, { status: event.target.value }); }}><option value="">Update status...</option>{nextStatuses[order.status].map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select>}
              <select aria-label={`Update payment for ${order.orderNumber}`} value={order.paymentStatus} onChange={(event) => void updateOrder(order, { paymentStatus: event.target.value })}><option value="UNPAID">Unpaid</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option><option value="REFUNDED">Refunded</option></select>
            </div>
          </article>)}</div> : <p className="catalog-empty">No orders found. Create your first order using the form.</p>}
          <p className="customer-history-note">*Order value excludes cancelled and returned orders. Revenue accounting and courier integration will be developed separately.</p>
        </section>
      </div>
    </div>
  );
}
