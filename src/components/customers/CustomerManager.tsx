"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  segment: "NEW" | "REGULAR" | "VIP";
  createdAt: string;
  purchaseSummary: { orderCount: number; lifetimeOrderValue: number; latestOrderAt: string | null };
};
type Summary = { total: number; new: number; regular: number; vip: number };

const segmentLabel: Record<Customer["segment"], string> = { NEW: "New", REGULAR: "Regular", VIP: "VIP" };

export function CustomerManager({ tenantId }: { tenantId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, new: 0, regular: 0, vip: 0 });
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ tenantId });
      if (search.trim()) params.set("search", search.trim());
      if (segment !== "ALL") params.set("segment", segment);
      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load customers.");
      setCustomers(result.customers || []);
      setSummary(result.summary || { total: 0, new: 0, regular: 0, vip: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, segment]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      tenantId,
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      email: String(form.get("email") || ""),
      city: String(form.get("city") || ""),
      address: String(form.get("address") || ""),
      notes: String(form.get("notes") || ""),
      segment: String(form.get("segment") || "NEW"),
    };
    try {
      const response = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create customer.");
      formElement.reset();
      setNotice("Customer added successfully.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="customer-layout">
      <section className="catalog-panel customer-form-panel">
        <div className="catalog-panel-heading"><div><span className="eyebrow">CUSTOMER PROFILE</span><h2>Add a customer</h2></div></div>
        <form className="catalog-form" onSubmit={submit}>
          <label htmlFor="customer-name">Full name</label><input id="customer-name" name="name" minLength={2} maxLength={120} required placeholder="Customer name" />
          <div className="catalog-two-fields"><div><label htmlFor="customer-phone">Phone</label><input id="customer-phone" name="phone" maxLength={30} placeholder="+880..." /></div><div><label htmlFor="customer-email">Email</label><input id="customer-email" name="email" type="email" maxLength={254} placeholder="name@example.com" /></div></div>
          <label htmlFor="customer-city">City</label><input id="customer-city" name="city" maxLength={100} placeholder="Dhaka" />
          <label htmlFor="customer-address">Address</label><textarea id="customer-address" name="address" rows={2} maxLength={500} />
          <label htmlFor="customer-segment">Customer segment</label><select id="customer-segment" name="segment" defaultValue="NEW"><option value="NEW">New</option><option value="REGULAR">Regular</option><option value="VIP">VIP</option></select>
          <label htmlFor="customer-notes">Internal notes</label><textarea id="customer-notes" name="notes" rows={3} maxLength={2000} placeholder="Optional notes for your team" />
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="catalog-notice" role="status">{notice}</p>}
          <button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving..." : "Add customer"}</button>
        </form>
      </section>
      <section className="catalog-panel customer-list-panel">
        <div className="catalog-panel-heading"><div><span className="eyebrow">CUSTOMER DIRECTORY</span><h2>Customers ({summary.total})</h2></div><button className="catalog-refresh" type="button" onClick={() => void load()}>Refresh</button></div>
        <div className="customer-filters"><input aria-label="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone or email..." /><select aria-label="Filter customer segment" value={segment} onChange={(event) => setSegment(event.target.value)}><option value="ALL">All segments</option><option value="NEW">New</option><option value="REGULAR">Regular</option><option value="VIP">VIP</option></select></div>
        {loading ? <p className="catalog-empty">Loading customers...</p> : customers.length ? <div className="customer-list">{customers.map((customer) => <article className="customer-row" key={customer.id}><div className="customer-avatar" aria-hidden="true">{customer.name.trim().charAt(0).toUpperCase()}</div><div className="customer-main"><strong>{customer.name}</strong><small>{customer.phone || "No phone"}{customer.email ? ` · ${customer.email}` : ""}</small><small>{[customer.city, customer.address].filter(Boolean).join(" · ") || "No address provided"}</small>{customer.notes && <p>{customer.notes}</p>}<small className="customer-purchase-inline">{customer.purchaseSummary.orderCount} orders · ৳ {customer.purchaseSummary.lifetimeOrderValue.toLocaleString("en-BD", { maximumFractionDigits: 2 })} order value</small><Link className="text-link customer-profile-link" href={`/dashboard/customers/${customer.id}`}>View profile &amp; purchase history →</Link></div><span className={`customer-segment segment-${customer.segment.toLowerCase()}`}>{segmentLabel[customer.segment]}</span></article>)}</div> : <p className="catalog-empty">No customers found. Add a customer or adjust your search.</p>}
        <p className="customer-history-note">Order value includes all linked orders except cancelled and returned orders. Open a customer profile to review individual purchases.</p>
      </section>
      <section className="customer-summary">
        <article><span>Total customers</span><strong>{summary.total}</strong></article><article><span>New</span><strong>{summary.new}</strong></article><article><span>Regular</span><strong>{summary.regular}</strong></article><article><span>VIP</span><strong>{summary.vip}</strong></article>
      </section>
    </div>
  );
}
