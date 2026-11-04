"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string; description?: string | null; _count?: { products: number } };
type Product = { id: string; name: string; sku?: string | null; price: string | number; stockQuantity: number; status: string; category?: { id: string; name: string } | null };

export function CatalogManager({ tenantId, mode }: { tenantId: string; mode: "products" | "categories" }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [categoryResponse, productResponse] = await Promise.all([
        fetch(`/api/categories?tenantId=${encodeURIComponent(tenantId)}`),
        fetch(`/api/products?tenantId=${encodeURIComponent(tenantId)}&pageSize=50`),
      ]);
      const categoryData = await categoryResponse.json();
      const productData = await productResponse.json();
      if (!categoryResponse.ok) throw new Error(categoryData.error || "Could not load categories.");
      if (!productResponse.ok) throw new Error(productData.error || "Could not load products.");
      setCategories(categoryData.categories || []);
      setProducts(productData.products || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load catalog.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const isCategory = mode === "categories";
    const payload = isCategory
      ? { tenantId, name: String(form.get("name") || ""), description: String(form.get("description") || "") }
      : {
          tenantId,
          name: String(form.get("name") || ""),
          sku: String(form.get("sku") || "") || undefined,
          categoryId: String(form.get("categoryId") || "") || undefined,
          price: Number(form.get("price")),
          stockQuantity: Number(form.get("stockQuantity") || 0),
          status: "ACTIVE",
        };
    try {
      const response = await fetch(isCategory ? "/api/categories" : "/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this item.");
      event.currentTarget.reset();
      setNotice(isCategory ? "Category created successfully." : "Product created successfully.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="catalog-layout">
      <section className="catalog-panel">
        <div className="catalog-panel-heading"><div><span className="eyebrow">{mode === "products" ? "PRODUCT CATALOG" : "PRODUCT ORGANIZATION"}</span><h2>{mode === "products" ? "Add a product" : "Create a category"}</h2></div></div>
        <form className="catalog-form" onSubmit={submit}>
          <label htmlFor="catalog-name">{mode === "products" ? "Product name" : "Category name"}</label>
          <input id="catalog-name" name="name" minLength={2} maxLength={mode === "products" ? 160 : 80} required />
          {mode === "products" ? <>
            <label htmlFor="catalog-sku">SKU (optional)</label><input id="catalog-sku" name="sku" maxLength={80} />
            <label htmlFor="catalog-category">Category</label>
            <select id="catalog-category" name="categoryId"><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
            <div className="catalog-two-fields"><div><label htmlFor="catalog-price">Selling price (৳ BDT)</label><input id="catalog-price" name="price" type="number" min="0.01" step="0.01" required /></div><div><label htmlFor="catalog-stock">Opening stock</label><input id="catalog-stock" name="stockQuantity" type="number" min="0" step="1" defaultValue="0" required /></div></div>
          </> : <><label htmlFor="catalog-description">Description (optional)</label><textarea id="catalog-description" name="description" rows={3} maxLength={500} /></>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="catalog-notice" role="status">{notice}</p>}
          <button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving..." : mode === "products" ? "Create product" : "Create category"}</button>
        </form>
      </section>
      <section className="catalog-panel">
        <div className="catalog-panel-heading"><div><span className="eyebrow">WORKSPACE DATA</span><h2>{mode === "products" ? `Products (${products.length})` : `Categories (${categories.length})`}</h2></div><button className="catalog-refresh" type="button" onClick={() => void load()}>Refresh</button></div>
        {loading ? <p className="catalog-empty">Loading workspace data...</p> : mode === "products" ? products.length ? <div className="catalog-list">{products.map((product) => <article className="catalog-row" key={product.id}><div><strong>{product.name}</strong><small>{product.sku || "No SKU"} · {product.category?.name || "Uncategorized"}</small></div><div className="catalog-row-meta"><strong>৳ {Number(product.price).toLocaleString("en-BD")}</strong><small>{product.stockQuantity} in stock · {product.status.toLowerCase()}</small></div></article>)}</div> : <p className="catalog-empty">No products yet. Create your first product using the form.</p> : categories.length ? <div className="catalog-list">{categories.map((category) => <article className="catalog-row" key={category.id}><div><strong>{category.name}</strong><small>{category.description || "No description"}</small></div><div className="catalog-row-meta"><strong>{category._count?.products || 0}</strong><small>products</small></div></article>)}</div> : <p className="catalog-empty">No categories yet. Create your first category using the form.</p>}
      </section>
    </div>
  );
}
