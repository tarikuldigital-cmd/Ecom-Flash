import {redirect} from "next/navigation";
import Link from "next/link";
import {getCurrentSession} from "@/lib/auth/session";
import {AbandonedCartManager} from "@/components/abandoned-carts/AbandonedCartManager";
export const metadata={title:"Abandoned carts"};
export default async function AbandonedCartsPage(){const session=await getCurrentSession();if(!session)redirect("/login");const workspace=session.user.memberships[0];if(!workspace)redirect("/dashboard");return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">GROWTH & RETENTION</span><h1>Abandoned cart recovery</h1><p className="lead">Review carts shoppers chose to save for later and follow up using their recorded consent.</p><AbandonedCartManager tenantId={workspace.tenantId}/></div></main>}
