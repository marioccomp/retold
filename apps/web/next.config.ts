import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],

  transpilePackages: ["@repo/database"],
};

export default nextConfig;
