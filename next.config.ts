import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // This is required for Vercel to correctly bundle the chromium package
    serverComponentsExternalPackages: ['@sparticuz/chromium'],
  },
};

export default nextConfig;