import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { CustomerDetail } from "@/components/customers/CustomerDetail";

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  const { customerId } = await params;
  return <CustomerDetail tenantId={workspace.tenantId} customerId={customerId} />;
}
