import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { CustomerManager } from "@/components/customers/CustomerManager";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">CUSTOMER RELATIONSHIP MANAGEMENT</span><h1>Customers</h1><p className="lead">Build and manage your customer directory for {workspace.tenant.name}. Keep contact details, delivery location and internal notes in one place.</p><CustomerManager tenantId={workspace.tenantId} /></div></main>;
}
