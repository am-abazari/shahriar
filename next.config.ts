import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["express", "pg", "@electric-sql/pglite"],
};

export default nextConfig;
