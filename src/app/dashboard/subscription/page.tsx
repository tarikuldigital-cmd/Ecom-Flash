import {redirect} from "next/navigation";
import Link from "next/link";
import {getCurrentSession} from "@/lib/auth/session";
import {SubscriptionManager} from "@/components/subscription/SubscriptionManager";
export const metadata={title:"Subscription & billing"};
export default async function SubscriptionPage(){const session=await getCurrentSession();if(!session)redirect("/login");const workspace=session.user.memberships[0];if(!workspace)redirect("/dashboard");return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">SAAS ACCOUNT</span><h1>Subscription & billing</h1><p className="lead">Review your plan, request an upgrade and view billing records.</p><SubscriptionManager tenantId={workspace.tenantId}/></div></main>}
