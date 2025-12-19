import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// carrega o .env da raiz do monorepo
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  transpilePackages: ["@repo/database"],
};

export default nextConfig;
