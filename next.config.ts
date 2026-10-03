import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // ExFAT/macOS metadata can make persisted Turbopack caches unreadable.
    // Keep the host default; opt out only in affected local environments.
    turbopackFileSystemCacheForDev:
      process.env.TURBOPACK_FILESYSTEM_CACHE !== "false",
    turbopackFileSystemCacheForBuild:
      process.env.TURBOPACK_FILESYSTEM_CACHE !== "false",
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.playchambana\\.com" }],
        destination: "https://playchambana.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
