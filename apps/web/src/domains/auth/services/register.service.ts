import bcrypt from "bcryptjs";
import { userRepository } from "@repo/database";
import { EmailAlreadyInUseError, UsernameAlreadyInUseError } from "@/src/domains/auth/auth.errors";

export async function registerUser(data: {
  name: string;
  email: string;
  username: string;
  password: string;
}) {
  const email = data.email.toLowerCase().trim();
  const username = data.username.trim();
  const password = data.password.trim();

  const existingUser = await userRepository.findByEmailOrUsername(email, username);

  if (existingUser) {
    if (existingUser.email === email) {
      throw new EmailAlreadyInUseError();
    }
    throw new UsernameAlreadyInUseError();
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userRepository.create({
    ...data,
    email,
    username,
    password: hashedPassword,
  });
}
