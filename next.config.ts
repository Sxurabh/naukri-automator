import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add playwright to the list of server-external packages
  serverExternalPackages: ['@sparticuz/chromium', 'playwright'],
};

export default nextConfig;