import bcrypt from "bcryptjs";
import { userRepository } from "@repo/database";
import { ipRateLimit, bruteForceRateLimit, protectionRateLimit } from "@/lib/redis-rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { InvalidCredentialsError, TooManyLoginAttemptsError } from "@/src/domains/auth/auth.errors";

export async function checkLoginRateLimit(identifier: string) {
  const login = identifier.toLowerCase().trim();
  const ip = await getClientIp();

  const bruteForceKey = `${ip}:${login}`;

  const [ipResult, bruteResult, protectionResult] = await Promise.all([
    ipRateLimit.limit(ip),
    bruteForceRateLimit.limit(bruteForceKey),
    protectionRateLimit.limit(login),
  ]);

  if (!ipResult.success || !bruteResult.success || !protectionResult.success) {
    throw new TooManyLoginAttemptsError();
  }
}
