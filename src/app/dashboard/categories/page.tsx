import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { CatalogManager } from "@/components/catalog/CatalogManager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">CATALOG ORGANIZATION</span><h1>Categories</h1><p className="lead">Organize products into categories for {workspace.tenant.name}.</p><CatalogManager tenantId={workspace.tenantId} mode="categories" /></div></main>;
}
