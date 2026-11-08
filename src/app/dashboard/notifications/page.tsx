import {redirect} from "next/navigation";
import Link from "next/link";
import {getCurrentSession} from "@/lib/auth/session";
import {NotificationCenter} from "@/components/notifications/NotificationCenter";
export const metadata={title:"Notifications"};
export default async function NotificationsPage(){const session=await getCurrentSession();if(!session)redirect("/login");const workspace=session.user.memberships[0];if(!workspace)redirect("/dashboard");return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">WORKSPACE ACTIVITY</span><h1>Notifications</h1><p className="lead">Review new order alerts and order status changes for this workspace.</p><NotificationCenter tenantId={workspace.tenantId}/></div></main>}
