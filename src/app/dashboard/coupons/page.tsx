import {redirect} from "next/navigation";
import Link from "next/link";
import {getCurrentSession} from "@/lib/auth/session";
import {CouponManager} from "@/components/coupons/CouponManager";
export const metadata={title:"Coupons"};
export default async function CouponsPage(){const session=await getCurrentSession();if(!session)redirect("/login");const workspace=session.user.memberships[0];if(!workspace)redirect("/dashboard");return <main className="simple-page"><div className="wrap"><Link className="text-link" href="/dashboard">← Back to workspace</Link><span className="eyebrow">SALES & MARKETING</span><h1>Discount coupons</h1><p className="lead">Create and manage promotion codes for your storefront. All discounts are in BDT.</p><CouponManager tenantId={workspace.tenantId}/></div></main>}
