"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Member = { id: string; role: string; status: string; joinedAt: string; user: { id: string; name: string | null; email: string; createdAt: string } };
type Invitation = { id: string; email: string; role: string; expiresAt: string; createdAt: string };
type TeamData = { members: Member[]; invitations: Invitation[]; currentUserId: string; canManage: boolean; currentRole: string };
const roleLabel: Record<string,string> = { OWNER:"Owner", ADMIN:"Admin", MANAGER:"Manager", STAFF:"Staff", VIEWER:"Viewer" };

export default function TeamManager({ tenantId }: { tenantId: string }) {
  const [data,setData]=useState<TeamData|null>(null);
  const [email,setEmail]=useState("");
  const [role,setRole]=useState("STAFF");
  const [inviteUrl,setInviteUrl]=useState("");
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{const r=await fetch(`/api/team?tenantId=${encodeURIComponent(tenantId)}`,{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load team.");setData(j);}
    catch(e){setError(e instanceof Error?e.message:"Could not load team.");}finally{setLoading(false);}
  },[tenantId]);
  useEffect(()=>{void load();},[load]);

  async function invite(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setSaving(true);setError("");setNotice("");setInviteUrl("");
    try{const r=await fetch("/api/team",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantId,email,role})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not invite member.");setNotice(j.message||"Team member added.");if(j.inviteUrl)setInviteUrl(j.inviteUrl);setEmail("");await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not invite member.");}finally{setSaving(false);}
  }
  async function update(member:Member,patch:{role?:string;status?:string}){
    setError("");setNotice("");
    try{const r=await fetch(`/api/team/${member.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantId,...patch})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not update member.");setNotice("Team member updated.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not update member.");}
  }
  async function remove(member:Member){
    if(!window.confirm(`Remove ${member.user.email} from this workspace? Their account will remain intact.`))return;
    setError("");setNotice("");
    try{const r=await fetch(`/api/team/${member.id}?tenantId=${encodeURIComponent(tenantId)}`,{method:"DELETE"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not remove member.");setNotice("Member removed from this workspace.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not remove member.");}
  }
  async function copyInvite(){try{await navigator.clipboard.writeText(inviteUrl);setNotice("Invitation link copied.");}catch{setError("Could not copy automatically. Select and copy the invitation link.");}}

  if(loading)return <div className="team-state">Loading workspace team…</div>;
  if(error&&!data)return <div className="team-state team-error">{error}<button onClick={load}>Try again</button></div>;
  if(!data)return null;
  return <main className="simple-page"><div className="wrap team-page">
    <header className="team-heading"><div><span className="eyebrow">WORKSPACE ACCESS</span><h1>Team management</h1><p>Manage who can access this store and what they can do.</p></div><span className="team-role-chip">Your role: {roleLabel[data.currentRole]||data.currentRole}</span></header>
    {error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="catalog-notice" role="status">{notice}</p>}
    {data.canManage&&<section className="catalog-panel team-invite-panel"><span className="eyebrow">ADD A TEAM MEMBER</span><h2>Invite by email</h2><p className="team-helper">Existing Ecom-Flash users are added immediately. New users receive a secure invitation link that you can share with them.</p>
      <form className="team-invite-form" onSubmit={invite}><label htmlFor="team-email">Email address</label><input id="team-email" type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="colleague@example.com"/><label htmlFor="team-role">Workspace role</label><select id="team-role" value={role} onChange={e=>setRole(e.target.value)}><option value="MANAGER">Manager</option><option value="STAFF">Staff</option><option value="VIEWER">Viewer</option>{data.currentRole==="OWNER"&&<option value="ADMIN">Admin</option>}</select><button className="button button-dark" disabled={saving||!email.trim()}>{saving?"Creating…":"Add / invite member"}</button></form>
      {inviteUrl&&<div className="team-invite-link"><strong>Invitation link (valid for 7 days)</strong><input readOnly value={inviteUrl}/><button type="button" onClick={copyInvite}>Copy link</button><small>Share this link only with the invited email address. Email delivery is not configured yet.</small></div>}
    </section>}
    <section className="catalog-panel team-members-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">WORKSPACE MEMBERS</span><h2>Members ({data.members.length})</h2></div><button className="catalog-refresh" onClick={load}>Refresh</button></div>
      <div className="team-member-list">{data.members.map(member=><article className="team-member-row" key={member.id}><div className="team-member-avatar">{(member.user.name||member.user.email).slice(0,1).toUpperCase()}</div><div className="team-member-identity"><strong>{member.user.name||"No display name"} {member.user.id===data.currentUserId&&<small>(You)</small>}</strong><span>{member.user.email}</span><small>Joined {new Date(member.joinedAt).toLocaleDateString("en-GB")}</small></div><span className={`team-status team-status-${member.status.toLowerCase()}`}>{member.status}</span><div className="team-member-role">{data.canManage&&member.role!=="OWNER"&&member.user.id!==data.currentUserId?<select aria-label={`Role for ${member.user.email}`} value={member.role} onChange={e=>void update(member,{role:e.target.value})}><option value="ADMIN" disabled={data.currentRole!=="OWNER"}>Admin</option><option value="MANAGER">Manager</option><option value="STAFF">Staff</option><option value="VIEWER">Viewer</option></select>:<span>{roleLabel[member.role]||member.role}</span>}</div>
        {data.canManage&&member.role!=="OWNER"&&member.user.id!==data.currentUserId&&<div className="team-member-actions"><button onClick={()=>void update(member,{status:member.status==="ACTIVE"?"SUSPENDED":"ACTIVE"})}>{member.status==="ACTIVE"?"Suspend":"Restore"}</button><button className="team-remove" onClick={()=>void remove(member)}>Remove</button></div>}
      </article>)}</div>
    </section>
    {data.canManage&&<section className="catalog-panel team-pending-panel"><div className="catalog-panel-heading"><div><span className="eyebrow">PENDING ACCESS</span><h2>Invitation links ({data.invitations.length})</h2></div></div>{data.invitations.length?data.invitations.map(inv=><div className="team-pending-row" key={inv.id}><div><strong>{inv.email}</strong><small>{roleLabel[inv.role]} · Expires {new Date(inv.expiresAt).toLocaleDateString("en-GB")}</small></div><span>Awaiting acceptance</span></div>):<p className="catalog-empty">No pending invitations.</p>}</section>}
    <p className="team-footnote">Owner permissions cannot be removed from this screen. Admins cannot manage other admins or grant the Admin role. Managers can view the team; only Owners and Admins can change access.</p>
  </div></main>;
}
