import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import StorefrontSettings from "@/components/storefront/StorefrontSettings";

export const metadata = { title: "Storefront Settings" };

export default async function StorefrontSettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <main className="min-h-screen bg-[#f7f8f6] px-4 py-8 text-[#18221d] md:px-6"><div className="mx-auto max-w-7xl"><header className="mb-6"><a href="/dashboard" className="text-sm text-[#52715e]">← Workspace</a><h1 className="mt-2 text-3xl font-semibold">Storefront</h1></header><StorefrontSettings tenantId={workspace.tenant.id} publicUrl={`/store/${workspace.tenant.slug}`} /></div></main>;
}
