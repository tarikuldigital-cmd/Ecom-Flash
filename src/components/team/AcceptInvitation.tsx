"use client";

import { useState } from "react";
import Link from "next/link";

export default function AcceptInvitation({ token }: { token: string }) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState(false);
  async function accept(){
    setLoading(true);setError("");
    try{const r=await fetch("/api/team/invitations/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not accept invitation.");setSuccess(true);}
    catch(e){setError(e instanceof Error?e.message:"Could not accept invitation.");}finally{setLoading(false);}
  }
  return <main className="simple-page"><div className="wrap invite-accept-page"><section className="catalog-panel"><span className="eyebrow">ECOM-FLASH WORKSPACE</span><h1>Join a team</h1>{success?<><p>Your invitation has been accepted. You now have access to the workspace.</p><Link className="button button-dark" href="/dashboard">Open workspace</Link></>:<><p>Accept this secure invitation using the Ecom-Flash account registered with the invited email address.</p>{error&&<p className="auth-error" role="alert">{error}</p>}<button className="button button-dark" onClick={accept} disabled={loading||!token}>{loading?"Accepting…":"Accept invitation"}</button><p className="invite-login-note">You must be signed in with the invited email address. <Link href="/login">Sign in</Link> first.</p></>}</section></div></main>;
}
