import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import LandingPageBuilder from "@/components/landing-pages/LandingPageBuilder";

export const metadata = { title: "Landing Page Builder" };

export default async function LandingPagesPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <main className="min-h-screen bg-[#f7f8f6] px-4 py-8 text-[#18221d] md:px-6"><div className="mx-auto max-w-7xl"><header className="mb-6 flex items-center justify-between"><div><a href="/dashboard" className="text-sm text-[#52715e]">← Workspace</a><h1 className="mt-2 text-3xl font-semibold">Landing pages</h1></div></header><LandingPageBuilder tenantId={workspace.tenant.id} tenantSlug={workspace.tenant.slug} /></div></main>;
}
