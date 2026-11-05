import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { InventoryManager } from "@/components/inventory/InventoryManager";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">INVENTORY OPERATIONS</span><h1>Inventory</h1><p className="lead">Monitor product stock, record incoming and outgoing quantities, and review a traceable history of every stock movement.</p><InventoryManager tenantId={workspace.tenantId} /></div></main>;
}
