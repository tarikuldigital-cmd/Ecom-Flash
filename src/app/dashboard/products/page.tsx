import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { CatalogManager } from "@/components/catalog/CatalogManager";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const workspace = session.user.memberships[0];
  if (!workspace) redirect("/dashboard");
  return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">CATALOG MANAGEMENT</span><h1>Products</h1><p className="lead">Create and organize products for {workspace.tenant.name}. Prices are stored as Bangladeshi Taka (৳ BDT).</p><CatalogManager tenantId={workspace.tenantId} mode="products" /></div></main>;
}
