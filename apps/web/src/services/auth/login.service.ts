import bcrypt from "bcryptjs";
import { userRepository } from "@repo/database";
import { loginRateLimit } from "@/lib/redis-rate-limit";

export async function loginUser(identifier: string, password: string) {
  const login = identifier.toLowerCase().trim();

  const { success } = await loginRateLimit.limit(login);

  if (!success) {
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
