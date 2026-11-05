"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Rate = { id:string; zoneName:string; city:string; charge:string|number; freeShippingMinimum:string|number|null; isActive:boolean };
const money=(n:number)=>"৳ "+n.toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2});

export function DeliveryRates({tenantId}:{tenantId:string}) {
  const [rates,setRates]=useState<Rate[]>([]);
  const [zoneName,setZoneName]=useState("");
  const [city,setCity]=useState("");
  const [charge,setCharge]=useState("80");
  const [freeMinimum,setFreeMinimum]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  const [active,setActive]=useState(true);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/shipping-rates?tenantId="+encodeURIComponent(tenantId));const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load rates.");setRates(j.rates||[]);}catch(e){setError(e instanceof Error?e.message:"Could not load rates.");}finally{setLoading(false);}},[tenantId]);
  useEffect(()=>{void load();},[load]);
  function reset(){setEditing(null);setZoneName("");setCity("");setCharge("80");setFreeMinimum("");setActive(true);}
  function edit(rate:Rate){setEditing(rate.id);setZoneName(rate.zoneName);setCity(rate.city);setCharge(String(rate.charge));setFreeMinimum(rate.freeShippingMinimum===null?"":String(rate.freeShippingMinimum));setActive(rate.isActive);}
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError("");setNotice("");try{const r=await fetch("/api/shipping-rates",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantId,...(editing?{rateId:editing}:{}),zoneName,city,charge:Number(charge),freeShippingMinimum:freeMinimum?Number(freeMinimum):null,isActive:active})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not save rate.");setNotice("Delivery rate saved.");reset();await load();}catch(e){setError(e instanceof Error?e.message:"Could not save rate.");}finally{setSaving(false);}}
  async function remove(id:string){if(!window.confirm("Delete this delivery rate?"))return;setSaving(true);setError("");try{const r=await fetch("/api/shipping-rates?tenantId="+encodeURIComponent(tenantId)+"&rateId="+encodeURIComponent(id),{method:"DELETE"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not delete rate.");setNotice("Delivery rate deleted.");await load();}catch(e){setError(e instanceof Error?e.message:"Could not delete rate.");}finally{setSaving(false);}}
  return <section className="catalog-panel" style={{marginBottom:24}}><div className="catalog-panel-heading"><div><span className="eyebrow">CHECKOUT SHIPPING</span><h2>Delivery zones &amp; charges</h2></div></div>
    <p className="form-note">Set a city/area delivery charge in BDT. Checkout matches the customer’s City / Area field (case-insensitive). If no active city rate exists, shipping remains unquoted and must be confirmed by the store.</p>
    <form className="catalog-form" onSubmit={save}><div className="catalog-two-fields"><div><label>Zone name</label><input value={zoneName} onChange={e=>setZoneName(e.target.value)} required minLength={2} maxLength={100} placeholder="Inside Dhaka"/></div><div><label>City / Area (exact match)</label><input value={city} onChange={e=>setCity(e.target.value)} required minLength={2} maxLength={100} placeholder="Dhaka"/></div></div>
      <div className="catalog-two-fields"><div><label>Delivery charge (৳)</label><input type="number" min="0" step="0.01" value={charge} onChange={e=>setCharge(e.target.value)} required/></div><div><label>Free delivery above (৳, optional)</label><input type="number" min="0" step="0.01" value={freeMinimum} onChange={e=>setFreeMinimum(e.target.value)} placeholder="Leave blank to disable"/></div></div>
      <label className="courier-enable"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Active at checkout</label>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="button button-dark" disabled={saving}>{saving?"Saving…":editing?"Update delivery rate":"Add delivery rate"}</button>{editing&&<button className="catalog-refresh" type="button" onClick={reset}>Cancel edit</button>}</div>
    </form>
    {loading?<p className="catalog-empty">Loading delivery rates…</p>:rates.length?<div className="courier-provider-list">{rates.map(rate=><article key={rate.id}><div><strong>{rate.zoneName} · {rate.city}</strong><small>{money(Number(rate.charge))}{rate.freeShippingMinimum!==null&&Number(rate.freeShippingMinimum)>0?" · Free above "+money(Number(rate.freeShippingMinimum)):" · No free-shipping threshold"}</small></div><div style={{display:"flex",alignItems:"center",gap:8}}><span className="courier-connection-state">{rate.isActive?"Active":"Inactive"}</span><button type="button" className="catalog-refresh" onClick={()=>edit(rate)}>Edit</button><button type="button" className="catalog-refresh" disabled={saving} onClick={()=>void remove(rate.id)}>Delete</button></div></article>)}</div>:<p className="catalog-empty">No delivery zones configured yet.</p>}
    {error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="catalog-notice" role="status">{notice}</p>}
  </section>;
}
