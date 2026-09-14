import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_PUBLIC_BASE_PATH ? { basePath: process.env.NEXT_PUBLIC_BASE_PATH } : {}),
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["sharp", "archiver"],
};

export default nextConfig;
