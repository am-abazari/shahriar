import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["express", "multer"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
