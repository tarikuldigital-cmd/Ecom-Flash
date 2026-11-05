import {redirect} from "next/navigation";
import Link from "next/link";
import {getCurrentSession} from "@/lib/auth/session";
import {CampaignManager} from "@/components/campaigns/CampaignManager";
export const metadata={title:"Marketing campaigns"};
export default async function CampaignsPage(){const session=await getCurrentSession();if(!session)redirect("/login");const workspace=session.user.memberships[0];if(!workspace)redirect("/dashboard");return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">GROWTH & RETENTION</span><h1>Marketing campaigns</h1><p className="lead">Plan customer campaigns, choose audiences and track campaign workflow. Budget values are in BDT.</p><CampaignManager tenantId={workspace.tenantId}/></div></main>}
