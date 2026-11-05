import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { CourierManager } from "@/components/courier/CourierManager";

export const metadata = { title: "Courier & Fulfillment" };

export default async function CourierPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <main className="simple-page"><div className="wrap"><span className="eyebrow">FULFILLMENT OPERATIONS</span><h1>Courier &amp; shipments</h1><p className="lead">Prepare parcels, manage shipment references and maintain delivery history.</p><CourierManager tenantId={workspace.tenantId} /></div></main>;
}
