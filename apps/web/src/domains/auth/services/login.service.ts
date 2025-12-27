import bcrypt from "bcryptjs";
import { userRepository } from "@repo/database";
import { ipRateLimit, bruteForceRateLimit, protectionRateLimit } from "@/lib/redis-rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { InvalidCredentialsError, TooManyLoginAttemptsError } from "@/src/domains/auth/auth.errors";

export async function loginUser(identifier: string, password: string) {
  const login = identifier.toLowerCase().trim();
  const ip = await getClientIp();

  const bruteForceKey = `${ip}:${login}`;

  const ipResult = await ipRateLimit.limit(ip);

  if (!ipResult.success) {
    throw new TooManyLoginAttemptsError();
  }

  const bruteResult = await bruteForceRateLimit.limit(bruteForceKey);
  if (!bruteResult.success) {
    throw new TooManyLoginAttemptsError();
  }

  const protectionResult = await protectionRateLimit.limit(login);

  if (!protectionResult.success) {
    throw new TooManyLoginAttemptsError();
  }

  const user = await userRepository.findByEmailOrUsername(login, login);

  if (!user || !user.password) {
    throw new InvalidCredentialsError();
  }

  const isPasswordCorrect = await bcrypt.compare(password.trim(), user.password);

  if (!isPasswordCorrect) {
    throw new InvalidCredentialsError();
  }

  return {
    id: String(user.id),
    role: user.role,
    plan: user.plan,
    name: user.name,
    image: user.image,
  };
}
