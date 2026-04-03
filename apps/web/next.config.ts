import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// carrega o .env da raiz do monorepo
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const isProduction = process.env.NODE_ENV === "production";

function getServerActionAllowedOrigins() {
  const candidates = [
    process.env.APP_URL,
    ...(process.env.ADDITIONAL_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ];

  if (!isProduction) {
    candidates.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  const allowedHosts = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      const normalized = candidate.includes("://") ? new URL(candidate) : new URL(`https://${candidate}`);
      allowedHosts.add(normalized.host);
    } catch {
      console.warn(`Ignoring invalid origin in serverActions.allowedOrigins: ${candidate}`);
    }
  }

  return Array.from(allowedHosts);
}

function getSecurityHeaders() {
  const contentSecurityPolicy = [
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    isProduction ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "Origin-Agent-Cluster", value: "?1" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    ...(isProduction
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : []),
  ];
}

const serverActionAllowedOrigins = getServerActionAllowedOrigins();

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  transpilePackages: ["@repo/database"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: serverActionAllowedOrigins,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
