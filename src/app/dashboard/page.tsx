import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata = { title: "Workspace" };

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const workspace = session.user.memberships[0];
  if (!workspace) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] px-6 py-16 text-[#18221d]">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#e4e9e5] bg-white p-8">
          <h1 className="text-2xl font-semibold">No active workspace</h1>
          <p className="mt-3 text-sm text-[#65736b]">Your account is signed in, but it is not currently assigned to an active workspace. Contact your workspace owner or support.</p>
          <Link className="mt-6 inline-flex rounded-full bg-[#193c2c] px-5 py-3 text-sm font-medium text-white" href="/">Back to Ecom-Flash</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] px-6 py-10 text-[#18221d]">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4e9e5] pb-6">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#52715e]">ECOM-FLASH WORKSPACE</p>
            <h1 className="mt-2 text-3xl font-semibold">{workspace.tenant.name}</h1>
            <p className="mt-1 text-sm text-[#65736b]">{session.user.name || session.user.email} · {workspace.role}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="rounded-full border border-[#dce4dd] bg-white px-5 py-2.5 text-sm font-medium" type="submit">Sign out</button>
          </form>
        </header>
        <nav className="mt-6 flex flex-wrap gap-3"><Link className="rounded-full bg-[#193c2c] px-5 py-3 text-sm font-medium text-white" href="/dashboard/products">Products</Link><Link className="rounded-full border border-[#dce4dd] bg-white px-5 py-3 text-sm font-medium" href="/dashboard/orders">Orders</Link><Link className="rounded-full border border-[#dce4dd] bg-white px-5 py-3 text-sm font-medium" href="/dashboard/categories">Categories</Link><Link className="rounded-full border border-[#dce4dd] bg-white px-5 py-3 text-sm font-medium" href="/dashboard/inventory">Inventory</Link><Link className="rounded-full border border-[#dce4dd] bg-white px-5 py-3 text-sm font-medium" href="/dashboard/customers">Customers</Link><Link className="rounded-full border border-[#dce4dd] bg-white px-5 py-3 text-sm font-medium" href="/dashboard/courier">Courier &amp; Fulfillment</Link></nav>
        <section className="mt-8 rounded-3xl border border-[#e4e9e5] bg-white p-8">
          <p className="text-sm font-semibold text-[#52715e]">FOUNDATION CONNECTED</p>
          <h2 className="mt-3 text-2xl font-semibold">Your commerce workspace is ready for the next modules.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65736b]">Your account, workspace membership and session are loaded from the database. Orders, products, inventory, analytics and courier operations will appear here as their database-backed modules are completed.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f5f7f4] p-4"><p className="text-xs text-[#65736b]">Workspace role</p><p className="mt-2 font-semibold">{workspace.role}</p></div>
            <div className="rounded-2xl bg-[#f5f7f4] p-4"><p className="text-xs text-[#65736b]">Currency</p><p className="mt-2 font-semibold">{workspace.tenant.currency} · ৳</p></div>
            <div className="rounded-2xl bg-[#f5f7f4] p-4"><p className="text-xs text-[#65736b]">Timezone</p><p className="mt-2 font-semibold">{workspace.tenant.timezone}</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
