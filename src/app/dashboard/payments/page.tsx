import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import PaymentManager from "@/components/payments/PaymentManager";

export const metadata = { title: "Payments & COD" };

export default async function PaymentsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <PaymentManager tenantId={workspace.tenant.id} />;
}
