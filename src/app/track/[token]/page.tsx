import { OrderTracking } from "@/components/storefront/OrderTracking";
export const metadata = { title: "Track your order | Ecom-Flash", robots: { index: false, follow: false } };
export default async function TrackOrderPage({ params }: { params: Promise<{ token: string }> }) {
 const { token } = await params;
 return <OrderTracking token={token} />;
}
