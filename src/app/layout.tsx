import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Ecom-Flash | Commerce Operations", description: "One platform for every order. Complete control." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
