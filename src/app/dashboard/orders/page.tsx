import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { OrderManager } from "@/components/orders/OrderManager";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">ORDER & FULFILLMENT OPERATIONS</span><h1>Orders</h1><p className="lead">Create orders, reserve product stock, track payment status and manage each order through its lifecycle. All amounts are stored in BDT.</p><OrderManager tenantId={workspace.tenantId} /></div></main>;
}
