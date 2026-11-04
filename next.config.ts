import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(isGitHubPages ? { basePath: "/Ecom-Flash" } : {}),
};

export default nextConfig;
