import { headers } from "next/headers";

export async function getClientIp () {
  const headersList = await headers();

  const directHeaders = [
    "cf-connecting-ip",
    "x-real-ip",
    "x-vercel-forwarded-for",
  ];

  for (const headerName of directHeaders) {
    const value = headersList.get(headerName)?.trim();

    if (value) {
      return value;
    }
  }

  const forwardedFor = headersList.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return headersList.get("x-real-ip") ?? "unknown";
}
