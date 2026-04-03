import crypto from "crypto";
import { userRepository, passwordResetRepository } from "@repo/database";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function forgotPasswordService(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user) return;

  await passwordResetRepository.invalidateAllActiveTokens(user.id);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await passwordResetRepository.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 1000 * 60 * 30),
  });

  const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}
