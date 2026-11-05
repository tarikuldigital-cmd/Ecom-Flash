import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import TeamManager from "@/components/team/TeamManager";

export const metadata = { title: "Team Management" };

export default async function TeamPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <TeamManager tenantId={workspace.tenant.id} />;
}
