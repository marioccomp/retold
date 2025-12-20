import bcrypt from "bcryptjs";
import { userRepository } from "@repo/database";

export async function loginUser(identifier: string, password: string) {
  const login = identifier.toLowerCase().trim();

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
  };
}
