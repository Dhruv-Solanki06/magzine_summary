import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // No `X-Powered-By: Next.js` on every response.
  poweredByHeader: false,
  // One URL per page: /magazines/foo/ 308-redirects to /magazines/foo, so
  // crawlers never see two copies. (Next's default — pinned so it stays put.)
  trailingSlash: false,
  // Emit a self-contained server bundle for a small production Docker image.
  output: "standalone",
};

export default nextConfig;
