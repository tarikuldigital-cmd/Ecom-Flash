import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/features", "/pricing", "/about", "/contact", "/help-center", "/faq", "/login", "/register", "/privacy", "/terms", "/refund"];
  return routes.map((route) => ({ url: `https://YOUR-DOMAIN.example${route}`, lastModified: new Date(), changeFrequency: "monthly", priority: route === "" ? 1 : 0.7 }));
}
