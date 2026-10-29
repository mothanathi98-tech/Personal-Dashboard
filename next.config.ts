import type { NextConfig } from "next";

// Private, per-user, always-dynamic app: no static caching of authenticated pages.
const nextConfig: NextConfig = {
  cacheComponents: false,
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "9mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Frame-Options", value: "DENY" }, { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
};

export default nextConfig;
