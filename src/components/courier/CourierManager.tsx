"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Provider = "PATHAO" | "STEADFAST" | "REDX" | "PAPERFLY" | "ECOURIER" | "OTHER";
type Status = "DRAFT" | "BOOKED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "DELIVERY_FAILED" | "RETURNED" | "CANCELLED";
type Order = { id:string; orderNumber:string; customerName:string; customerPhone:string; shippingAddress:string; shippingCity:string|null; total:string|number };
type Account = { id:string; provider:Provider; displayName:string; isEnabled:boolean; accountReference:string|null };
type Event = { id:string; title:string; details:string|null; createdAt:string; source:string };
type Shipment = { id:string; provider:Provider; status:Status; recipientName:string; recipientPhone:string; deliveryAddress:string; deliveryCity:string|null; codAmount:string|number; deliveryCharge:string|number; trackingNumber:string|null; consignmentId:string|null; bookingReference:string|null; trackingUrl:string|null; createdAt:string; order:{orderNumber:string}; events:Event[] };
type Data = { shipments:Shipment[]; eligibleOrders:Order[]; accounts:Account[]; summary:Record<string,number> };
const providers:Provider[]=["PATHAO","STEADFAST","REDX","PAPERFLY","ECOURIER","OTHER"];
const names:Record<Provider,string>={PATHAO:"Pathao",STEADFAST:"Steadfast",REDX:"RedX",PAPERFLY:"Paperfly",ECOURIER:"eCourier",OTHER:"Other"};
const statuses:Record<Status,string>={DRAFT:"Draft",BOOKED:"Booked",PICKED_UP:"Picked up",IN_TRANSIT:"In transit",DELIVERED:"Delivered",DELIVERY_FAILED:"Delivery failed",RETURNED:"Returned",CANCELLED:"Cancelled"};
const transitions:Record<Status,Status[]>={DRAFT:["BOOKED","CANCELLED"],BOOKED:["PICKED_UP","CANCELLED"],PICKED_UP:["IN_TRANSIT","DELIVERY_FAILED","RETURNED"],IN_TRANSIT:["DELIVERED","DELIVERY_FAILED","RETURNED"],DELIVERY_FAILED:["IN_TRANSIT","RETURNED","CANCELLED"],DELIVERED:[],RETURNED:[],CANCELLED:[]};
const money=(v:string|number)=>"৳ "+Number(v).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2});

export function CourierManager({tenantId}:{tenantId:string}) {
 const [data,setData]=useState<Data>({shipments:[],eligibleOrders:[],accounts:[],summary:{}});
 const [orderId,setOrderId]=useState(""); const [provider,setProvider]=useState<Provider>("PATHAO");
 const [description,setDescription]=useState(""); const [weight,setWeight]=useState(""); const [charge,setCharge]=useState("0");
 const [accountProvider,setAccountProvider]=useState<Provider>("PATHAO"); const [accountName,setAccountName]=useState("Pathao");
 const [accountRef,setAccountRef]=useState(""); const [enabled,setEnabled]=useState(false);
 const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/courier?tenantId="+encodeURIComponent(tenantId));const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load courier data.");setData(j);}catch(e){setError(e instanceof Error?e.message:"Unable to load courier data.");}finally{setLoading(false);}},[tenantId]);
 useEffect(()=>{void load();},[load]);
 async function createDraft(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError("");setNotice("");try{const r=await fetch("/api/courier",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantId,orderId,provider,parcelDescription:description,weightGrams:weight?Number(weight):undefined,deliveryCharge:Number(charge)})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not prepare shipment.");setNotice(j.message||"Shipment draft saved.");setOrderId("");setDescription("");setWeight("");setCharge("0");await load();}catch(e){setError(e instanceof Error?e.message:"Unable to prepare shipment.");}finally{setSaving(false);}}
 async function saveAccount(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError("");setNotice("");try{const r=await fetch("/api/courier/accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantId,provider:accountProvider,displayName:accountName,accountReference:accountRef,isEnabled:enabled})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not save profile.");setNotice(j.message||"Courier profile saved.");await load();}catch(e){setError(e instanceof Error?e.message:"Unable to save profile.");}finally{setSaving(false);}}
 async function updateShipment(shipment:Shipment,e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError("");setNotice("");const form=new FormData(e.currentTarget);try{const r=await fetch("/api/courier",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantId,shipmentId:shipment.id,status:String(form.get("status")||""),trackingNumber:String(form.get("trackingNumber")||""),consignmentId:String(form.get("consignmentId")||""),bookingReference:String(form.get("bookingReference")||""),trackingUrl:String(form.get("trackingUrl")||""),details:String(form.get("details")||"")})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not update shipment.");setNotice("Shipment status updated and logged.");await load();}catch(e){setError(e instanceof Error?e.message:"Unable to update shipment.");}finally{setSaving(false);}}
 return <div className="courier-workspace">
  <section className="courier-notice"><strong>Draft and manual operations only</strong><p>Courier profiles do not connect to provider APIs yet. Saving a shipment creates a draft only; no booking, label, pickup request or live tracking is claimed until official credentials and integrations are completed.</p></section>
  <section className="courier-stats">{(["DRAFT","BOOKED","PICKED_UP","IN_TRANSIT","DELIVERED","DELIVERY_FAILED"] as Status[]).map(s=><article key={s}><span>{statuses[s]}</span><strong>{data.summary[s]||0}</strong></article>)}</section>
  <div className="courier-columns">
   <section className="catalog-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">PARCEL PREPARATION</span><h2>Create shipment draft</h2></div></div>
    <form className="catalog-form" onSubmit={createDraft}><label htmlFor="courier-order">Confirmed / processing order</label><select id="courier-order" value={orderId} onChange={e=>setOrderId(e.target.value)} required><option value="">Select an order</option>{data.eligibleOrders.map(o=><option key={o.id} value={o.id}>{o.orderNumber+" · "+o.customerName+" · "+money(o.total)}</option>)}</select>
     <label htmlFor="courier-provider">Courier provider</label><select id="courier-provider" value={provider} onChange={e=>setProvider(e.target.value as Provider)}>{providers.map(p=><option key={p} value={p}>{names[p]}</option>)}</select>
     <label htmlFor="courier-description">Parcel description</label><input id="courier-description" maxLength={300} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Product / parcel details"/>
     <div className="catalog-two-fields"><div><label htmlFor="courier-weight">Weight (grams)</label><input id="courier-weight" type="number" min="1" max="100000" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Optional"/></div><div><label htmlFor="courier-charge">Delivery charge (৳)</label><input id="courier-charge" type="number" min="0" step="0.01" value={charge} onChange={e=>setCharge(e.target.value)}/></div></div>
     <button className="button button-dark" type="submit" disabled={saving||!orderId}>{saving?"Saving...":"Save shipment draft"}</button>{!data.eligibleOrders.length&&<p className="form-note">No eligible orders. Confirm or process an order first.</p>}
    </form>
   </section>
   <section className="catalog-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">PROVIDER DIRECTORY</span><h2>Courier profiles</h2></div></div>
    <div className="courier-provider-list">{providers.map(p=>{const a=data.accounts.find(x=>x.provider===p);return <article key={p}><div><strong>{names[p]}</strong><small>{a?a.displayName:"Profile not configured"} · {a&&a.isEnabled?"Enabled for draft selection":"Not enabled"}</small>{a&&a.accountReference&&<small>Account ref: {a.accountReference}</small>}</div><span className="courier-connection-state">API not connected</span></article>;})}</div>
    <form className="catalog-form courier-account-form" onSubmit={saveAccount}><h3>Save provider profile</h3><label htmlFor="account-provider">Provider</label><select id="account-provider" value={accountProvider} onChange={e=>{const p=e.target.value as Provider;setAccountProvider(p);setAccountName(names[p]);}}>{providers.map(p=><option key={p} value={p}>{names[p]}</option>)}</select>
     <label htmlFor="account-name">Display name</label><input id="account-name" value={accountName} onChange={e=>setAccountName(e.target.value)} minLength={2} maxLength={100} required/>
     <label htmlFor="account-ref">Account reference (optional)</label><input id="account-ref" value={accountRef} onChange={e=>setAccountRef(e.target.value)} maxLength={160}/>
     <label className="courier-enable"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enable for draft selection</label><button className="catalog-refresh" type="submit" disabled={saving}>Save profile</button>
    </form>
   </section>
  </div>
  <section className="catalog-panel courier-shipment-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">FULFILLMENT QUEUE</span><h2>Shipments ({data.shipments.length})</h2></div><button className="catalog-refresh" type="button" onClick={()=>void load()}>Refresh</button></div>
   {loading?<p className="catalog-empty">Loading shipments...</p>:data.shipments.length?<div className="courier-shipment-list">{data.shipments.map(s=><article className="courier-shipment-card" key={s.id}>
    <div className="courier-shipment-head"><div><strong>{s.order.orderNumber}</strong><small>{names[s.provider]} · {new Date(s.createdAt).toLocaleString("en-BD",{dateStyle:"medium",timeStyle:"short"})}</small></div><span className={"order-status status-"+s.status.toLowerCase()}>{statuses[s.status]}</span></div>
    <div className="courier-recipient"><b>{s.recipientName}</b><span>{s.recipientPhone}</span><small>{s.deliveryAddress+(s.deliveryCity?", "+s.deliveryCity:"")}</small></div>
    <div className="courier-financials"><span>COD: <b>{money(s.codAmount)}</b></span><span>Delivery: <b>{money(s.deliveryCharge)}</b></span></div>
    {(s.trackingNumber||s.consignmentId||s.bookingReference)&&<p className="courier-reference">Tracking: {s.trackingNumber||"—"} · Consignment: {s.consignmentId||"—"} · Booking: {s.bookingReference||"—"}</p>}
    {s.trackingUrl&&<a className="text-link" href={s.trackingUrl} target="_blank" rel="noreferrer">Open tracking link ↗</a>}
    <form className="courier-update-form" onSubmit={e=>void updateShipment(s,e)}><label>Next status<select name="status" defaultValue="" required><option value="" disabled>Select next status</option>{transitions[s.status].map(t=><option key={t} value={t}>{statuses[t]}</option>)}</select></label>
     <div className="catalog-two-fields"><div><label>Tracking number<input name="trackingNumber" maxLength={120} defaultValue={s.trackingNumber||""}/></label></div><div><label>Consignment ID<input name="consignmentId" maxLength={120} defaultValue={s.consignmentId||""}/></label></div></div>
     <label>Booking reference<input name="bookingReference" maxLength={120} defaultValue={s.bookingReference||""}/></label><label>Tracking URL<input name="trackingUrl" type="url" maxLength={1000} defaultValue={s.trackingUrl||""} placeholder="https://..."/></label><label>Update note<input name="details" maxLength={1000} placeholder="Optional status note"/></label>
     <button className="catalog-refresh" type="submit" disabled={saving||transitions[s.status].length===0}>Save status update</button>
    </form>
    {s.events.length>0&&<div className="courier-events"><strong>Recent tracking history</strong>{s.events.map(ev=><div key={ev.id}><b>{ev.title}</b><small>{new Date(ev.createdAt).toLocaleString("en-BD",{dateStyle:"medium",timeStyle:"short"})} · {ev.source}{ev.details?" · "+ev.details:""}</small></div>)}</div>}
   </article>)}</div>:<p className="catalog-empty">No shipments yet. Prepare a confirmed or processing order.</p>}
  </section>
  {error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="catalog-notice" role="status">{notice}</p>}
 </div>;
}
