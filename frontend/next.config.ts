import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // This project deploys via vercel.json "services", which does not enable
    // Vercel's platform image optimizer — /_next/image 404s in production.
    // Serve images directly instead (assets are pre-optimized JPEGs).
    unoptimized: true,
    // Still allow remote image hosts if optimization is re-enabled later.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
