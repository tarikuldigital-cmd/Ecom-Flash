"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Product = { id: string; name: string; sku: string | null; stockQuantity: number; status: string };
type Movement = {
  id: string;
  type: string;
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  createdAt: string;
  product: { id: string; name: string; sku: string | null };
  actor?: { name: string | null; email: string } | null;
};
type InventoryData = {
  products: Product[];
  movements: Movement[];
  summary: { totalProducts: number; lowStock: number; outOfStock: number; totalUnits: number };
};

const movementTypes = [
  ["ADJUSTMENT", "Manual adjustment"],
  ["RESTOCK", "Restock"],
  ["SALE", "Sale / dispatch"],
  ["RETURN", "Customer return"],
  ["DAMAGE", "Damaged / lost"],
  ["CORRECTION", "Stock correction"],
];

export function InventoryManager({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/inventory?tenantId=${encodeURIComponent(tenantId)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load inventory.");
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inventory is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      tenantId,
      productId: String(form.get("productId") || ""),
      type: String(form.get("type") || "ADJUSTMENT"),
      quantityDelta: Number(form.get("quantityDelta")),
      reason: String(form.get("reason") || ""),
    };
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save stock movement.");
      formElement.reset();
      setNotice(`Stock updated: ${result.movement.stockBefore} → ${result.movement.stockAfter} units.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save stock movement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inventory-layout">
      <section className="inventory-summary">
        <article><span>Total products</span><strong>{data?.summary.totalProducts ?? "—"}</strong></article>
        <article><span>Total units in stock</span><strong>{data?.summary.totalUnits ?? "—"}</strong></article>
        <article className="inventory-warning"><span>Low stock (1–5)</span><strong>{data?.summary.lowStock ?? "—"}</strong></article>
        <article className="inventory-danger"><span>Out of stock</span><strong>{data?.summary.outOfStock ?? "—"}</strong></article>
      </section>

      <section className="catalog-panel">
        <div className="catalog-panel-heading"><div><span className="eyebrow">STOCK CONTROL</span><h2>Record a stock movement</h2></div></div>
        <form className="catalog-form inventory-form" onSubmit={submit}>
          <label htmlFor="inventory-product">Product</label>
          <select id="inventory-product" name="productId" required defaultValue="">
            <option value="" disabled>Select a product</option>
            {(data?.products || []).map((product) => <option key={product.id} value={product.id}>{product.name} · Current: {product.stockQuantity}</option>)}
          </select>
          <div className="catalog-two-fields">
            <div><label htmlFor="inventory-type">Movement type</label><select id="inventory-type" name="type" defaultValue="ADJUSTMENT">{movementTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div><label htmlFor="inventory-quantity">Quantity change (+ / −)</label><input id="inventory-quantity" name="quantityDelta" type="number" step="1" min="-1000000" max="1000000" placeholder="e.g. 25 or -3" required /></div>
          </div>
          <label htmlFor="inventory-reason">Reason / reference</label>
          <input id="inventory-reason" name="reason" minLength={3} maxLength={300} placeholder="e.g. Supplier invoice #INV-102" required />
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="catalog-notice" role="status">{notice}</p>}
          <button className="button button-dark" type="submit" disabled={saving || !data?.products.length}>{saving ? "Saving movement..." : "Update stock"}</button>
          <p className="form-note">Positive quantity adds stock. Negative quantity removes stock. Stock cannot fall below zero. Every successful movement is recorded in the history.</p>
        </form>
      </section>

      <section className="catalog-panel inventory-products">
        <div className="catalog-panel-heading"><div><span className="eyebrow">CURRENT STOCK</span><h2>Product inventory</h2></div><button className="catalog-refresh" type="button" onClick={() => void load()}>Refresh</button></div>
        {loading ? <p className="catalog-empty">Loading inventory...</p> : data?.products.length ? <div className="catalog-list">{data.products.map((product) => <article className="catalog-row" key={product.id}><div><strong>{product.name}</strong><small>{product.sku || "No SKU"}</small></div><div className="catalog-row-meta"><strong>{product.stockQuantity} units</strong><small>{product.stockQuantity === 0 ? "Out of stock" : product.stockQuantity <= 5 ? "Low stock" : "In stock"}</small></div></article>)}</div> : <p className="catalog-empty">No active products yet. Add products before recording stock.</p>}
      </section>

      <section className="catalog-panel inventory-history">
        <div className="catalog-panel-heading"><div><span className="eyebrow">AUDITABLE STOCK LOG</span><h2>Recent stock movements</h2></div></div>
        {loading ? <p className="catalog-empty">Loading movement history...</p> : data?.movements.length ? <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Product</th><th>Type</th><th>Change</th><th>Before → After</th><th>Reason</th><th>Date</th></tr></thead><tbody>{data.movements.map((movement) => <tr key={movement.id}><td><strong>{movement.product.name}</strong><small>{movement.product.sku || "No SKU"}</small></td><td>{movement.type.replaceAll("_", " ").toLowerCase()}</td><td className={movement.quantityDelta > 0 ? "stock-positive" : "stock-negative"}>{movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}</td><td>{movement.stockBefore} → {movement.stockAfter}</td><td>{movement.reason}</td><td>{new Date(movement.createdAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</td></tr>)}</tbody></table></div> : <p className="catalog-empty">No stock movements recorded yet.</p>}
      </section>
    </div>
  );
}
