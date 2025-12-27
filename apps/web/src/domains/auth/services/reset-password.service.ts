import crypto from "crypto";
import bcrypt from "bcryptjs";
import { userRepository, passwordResetRepository } from "@repo/database";

export async function resetPasswordService(token: string, newPassword: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const resetToken = await passwordResetRepository.findValidByTokenHash(tokenHash);

  if (!resetToken) throw new Error("INVALID_TOKEN");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepository.updatePassword(resetToken.userId, passwordHash);
  await passwordResetRepository.markAsUsed(resetToken.id);
}
