import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
