import bcrypt from "bcryptjs";
import { userRepository } from "@repo/database";
import {
  ipRateLimit,
  bruteForceRateLimit,
  protectionRateLimit,
} from "@/lib/redis-rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

export async function loginUser(identifier: string, password: string) {
  const login = identifier.toLowerCase().trim();
  const ip = await getClientIp();

  const bruteForceKey = `${ip}:${login}`

  const ipResult = await ipRateLimit.limit(ip);

  if (!ipResult.success) {
    throw new Error ("Too many login attempts. Try again later");
  }

  const bruteResult = await bruteForceRateLimit.limit(bruteForceKey);
  if (!bruteResult.success) {
    throw new Error("Too many login attempts. Try again later");
  }

  const protectionResult = await protectionRateLimit.limit(login);
  
  if (!protectionResult.success) {
    throw new Error("Too many login attempts. Try again later");
  }

  const user = await userRepository.findByEmailOrUsername(login, login);

  if (!user || !user.password) {
    throw new Error("Invalid credentials");
  }

  const isPasswordCorrect = await bcrypt.compare(password.trim(), user.password);

  if (!isPasswordCorrect) {
    throw new Error("Invalid credentials");
  }

  return {
    id: String(user.id),
    role: user.role,
    plan: user.plan,
    name: user.name,
    image: user.image,
  };
}
