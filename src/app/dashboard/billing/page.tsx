import {redirect} from "next/navigation";
import Link from "next/link";
import {getCurrentSession} from "@/lib/auth/session";
import {BillingOverview} from "@/components/billing/BillingOverview";
export const metadata={title:"Subscription & Billing"};
export default async function BillingPage(){const session=await getCurrentSession();if(!session)redirect("/login");const workspace=session.user.memberships[0];if(!workspace)redirect("/dashboard");if(workspace.role!=="OWNER"&&workspace.role!=="ADMIN")redirect("/dashboard");return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">SAAS ACCOUNT</span><h1>Subscription &amp; Billing</h1><p className="lead">View your current plan, trial status and workspace usage.</p><BillingOverview tenantId={workspace.tenantId}/></div></main>}
