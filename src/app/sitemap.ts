import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) return [];
  const routes = ["", "/features", "/pricing", "/about", "/contact", "/help-center", "/faq", "/login", "/register", "/privacy", "/terms", "/refund"];
  return routes.map((route) => ({ url: new URL(route, baseUrl).toString(), lastModified: new Date(), changeFrequency: "monthly", priority: route === "" ? 1 : 0.7 }));
}
