import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/database";
import {
  cleanupIntegrationRun,
  createIntegrationRunId,
  disconnectIntegrationDb,
} from "../../src/test-utils/integration-db";

type CreateE2EUserInput = {
  runId: string;
  label: string;
  password?: string;
  username?: string | null;
  hasCompletedOnboarding?: boolean;
  name?: string;
};

export function createE2ERunId(prefix: string) {
  return createIntegrationRunId(`e2e-${prefix}`);
}

export async function createE2EUser(input: CreateE2EUserInput) {
  const password = input.password ?? `Secret123!${input.runId}`;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: `integration+${input.runId}-${input.label}@example.com`,
      username:
        input.username === undefined
          ? `${input.runId.replace(/[^a-z0-9]/gi, "").slice(0, 10)}${input.label}`.slice(0, 20)
          : input.username,
      password: passwordHash,
      name: input.name ?? `${input.label} e2e`,
      hasCompletedOnboarding: input.hasCompletedOnboarding ?? true,
    },
  });

  return {
    user,
    password,
  };
}

export async function createPasswordResetToken(userId: number) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  return rawToken;
}

export async function getE2EUserState(userId: number) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      username: true,
      hasCompletedOnboarding: true,
    },
  });
}

export async function cleanupE2ERun(runId: string) {
  await cleanupIntegrationRun(runId);
}

export async function disconnectE2EDb() {
  await disconnectIntegrationDb();
}
