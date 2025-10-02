import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use the new property name as suggested by the warning message
  serverExternalPackages: ['@sparticuz/chromium'],
};

export default nextConfig;