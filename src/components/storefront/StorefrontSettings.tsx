"use client";

import { useEffect, useState } from "react";

type Store = { name:string; tagline:string|null; description:string|null; logoUrl:string|null; bannerUrl:string|null; announcement:string|null; primaryColor:string; contactPhone:string|null; contactEmail:string|null };
const initial: Store = { name:"My Store",tagline:"A better way to shop",description:"Discover our latest products and collections.",logoUrl:null,bannerUrl:null,announcement:"Welcome to our store",primaryColor:"#193c2c",contactPhone:null,contactEmail:null };

export default function StorefrontSettings({ tenantId, publicUrl }: { tenantId:string; publicUrl:string }) {
  const [store,setStore]=useState<Store>(initial);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  useEffect(()=>{ void (async()=>{try{const r=await fetch(`/api/storefront/settings?tenantId=${encodeURIComponent(tenantId)}`);const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load settings.");setStore({...initial,...d.store});}catch(e){setError(e instanceof Error?e.message:"Could not load settings.");}finally{setLoading(false);}})();},[tenantId]);
  function update<K extends keyof Store>(key:K,value:Store[K]){setStore(s=>({...s,[key]:value}));}
  async function save(){setSaving(true);setError("");setMessage("");try{const r=await fetch(`/api/storefront/settings?tenantId=${encodeURIComponent(tenantId)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(store)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not save settings.");setStore({...initial,...d.store});setMessage("Storefront settings saved.");}catch(e){setError(e instanceof Error?e.message:"Could not save settings.");}finally{setSaving(false);}}
  return <div className="store-settings">
    <div className="store-settings-head"><div><p className="text-sm font-semibold tracking-wide text-[#52715e]">YOUR ONLINE STORE</p><h2 className="mt-1 text-2xl font-semibold">Storefront settings</h2><p className="mt-1 text-sm text-[#65736b]">Customize your store identity and public-facing brand experience.</p></div><a className="store-public-link" href={publicUrl} target="_blank" rel="noreferrer">View storefront ↗</a></div>
    {loading?<p>Loading settings…</p>:<div className="store-settings-grid"><section className="store-settings-form">
      <label>Store name<input value={store.name} onChange={e=>update("name",e.target.value)}/></label>
      <label>Tagline<input value={store.tagline||""} onChange={e=>update("tagline",e.target.value||null)} maxLength={160}/></label>
      <label>Store description<textarea rows={4} value={store.description||""} onChange={e=>update("description",e.target.value||null)}/></label>
      <label>Announcement bar<input value={store.announcement||""} onChange={e=>update("announcement",e.target.value||null)} maxLength={180}/></label>
      <label>Logo image URL<input type="url" placeholder="https://…" value={store.logoUrl||""} onChange={e=>update("logoUrl",e.target.value||null)}/></label>
      <label>Hero banner image URL<input type="url" placeholder="https://…" value={store.bannerUrl||""} onChange={e=>update("bannerUrl",e.target.value||null)}/></label>
      <div className="store-color-row"><label>Brand color<input type="color" value={store.primaryColor} onChange={e=>update("primaryColor",e.target.value)}/></label><span>{store.primaryColor}</span></div>
      <label>Contact phone<input value={store.contactPhone||""} onChange={e=>update("contactPhone",e.target.value||null)}/></label>
      <label>Contact email<input type="email" value={store.contactEmail||""} onChange={e=>update("contactEmail",e.target.value||null)}/></label>
      {error&&<p className="lp-error">{error}</p>}{message&&<p className="lp-success">{message}</p>}
      <button className="lp-primary" disabled={saving||store.name.trim().length<2} onClick={()=>void save()}>{saving?"Saving…":"Save storefront settings"}</button>
    </section><aside className="store-live-preview" style={{"--store-brand":store.primaryColor} as React.CSSProperties}>
      <div className="store-preview-browser"><i/><i/><i/><span>Storefront preview</span></div>
      {store.announcement&&<div className="store-preview-announcement">{store.announcement}</div>}
      <header>{store.logoUrl?<img src={store.logoUrl} alt="" />:<strong>{store.name||"Your Store"}</strong>}<nav>Home　 Shop　 Contact</nav></header>
      <div className="store-preview-hero" style={store.bannerUrl?{backgroundImage:`linear-gradient(90deg,rgba(10,20,14,.68),rgba(10,20,14,.12)),url("${store.bannerUrl}")`}:undefined}><div><small>WELCOME TO</small><h3>{store.name||"Your Store"}</h3><p>{store.tagline||"Your brand, your story."}</p><span>Explore collection</span></div></div>
      <div className="store-preview-products"><h4>Featured products</h4><div><span/><span/><span/></div><p>Products published in your catalog will appear here.</p></div>
      <footer>{store.contactEmail||"Contact your store"}　{store.contactPhone||""}</footer>
    </aside></div>}
  </div>;
}
