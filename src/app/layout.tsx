import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ecom-flash.example"),
  title: { default: "Ecom-Flash | Commerce, in focus.", template: "%s | Ecom-Flash" },
  description: "A connected workspace for e-commerce orders, inventory, fulfillment, customers and growth.",
  applicationName: "Ecom-Flash",
  keywords: ["ecommerce management", "order management", "inventory", "commerce operations", "Bangladesh SaaS"],
  openGraph: { title: "Ecom-Flash | Commerce, in focus.", description: "One connected workspace for modern commerce teams.", type: "website" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
