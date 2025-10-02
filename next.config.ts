import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add playwright to the list of server-external packages
  serverExternalPackages: ['@sparticuz/chromium', 'playwright'],
  
  // Add this block to disable ESLint during the build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;