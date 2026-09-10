import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["express", "@electric-sql/pglite"],
};

export default nextConfig;
