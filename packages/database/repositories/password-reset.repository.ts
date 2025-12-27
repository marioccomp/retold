import { prisma } from "../index";

export const passwordResetRepository = {
  create(data: { userId: number; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data });
  },
  findValidByTokenHash(hash: string) {
    return prisma.passwordResetToken.findFirst({
      where: { tokenHash: hash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  },
  markAsUsed(id: number) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },
  invalidateAllActiveTokens(userId: number) {
    return prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },
};
