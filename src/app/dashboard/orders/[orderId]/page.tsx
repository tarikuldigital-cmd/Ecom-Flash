import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { OrderDetail } from "@/components/orders/OrderDetail";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  const { orderId } = await params;
  return <OrderDetail tenantId={workspace.tenantId} orderId={orderId} />;
}
