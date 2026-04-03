import {
  availabilityCheckIdentityRateLimit,
  availabilityCheckIpRateLimit,
  destructiveActionIpRateLimit,
  destructiveActionUserRateLimit,
  forgotPasswordIdentityRateLimit,
  forgotPasswordIpRateLimit,
  registerEmailRateLimit,
  registerIpRateLimit,
  registerUsernameRateLimit,
} from "@/lib/redis-rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { TooManyRequestsError } from "@/src/domains/auth/auth.errors";

type RateLimitCheck = {
  key: string;
  limit: (identifier: string) => Promise<{ success: boolean }>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function enforceRateLimit(checks: RateLimitCheck[]) {
  const results = await Promise.all(checks.map((check) => check.limit(check.key)));

  if (results.some((result) => !result.success)) {
    throw new TooManyRequestsError();
  }
}

export async function enforceRegisterRateLimit(email: string, username: string) {
  const ip = await getClientIp();

  await enforceRateLimit([
    { key: ip, limit: registerIpRateLimit.limit.bind(registerIpRateLimit) },
    {
      key: normalizeEmail(email),
      limit: registerEmailRateLimit.limit.bind(registerEmailRateLimit),
    },
    {
      key: normalizeUsername(username),
      limit: registerUsernameRateLimit.limit.bind(registerUsernameRateLimit),
    },
  ]);
}

export async function enforceForgotPasswordRateLimit(email: string) {
  const ip = await getClientIp();

  await enforceRateLimit([
    { key: ip, limit: forgotPasswordIpRateLimit.limit.bind(forgotPasswordIpRateLimit) },
    {
      key: normalizeEmail(email),
      limit: forgotPasswordIdentityRateLimit.limit.bind(forgotPasswordIdentityRateLimit),
    },
  ]);
}

export async function enforceAvailabilityCheckRateLimit(
  kind: "email" | "username",
  value: string
) {
  const ip = await getClientIp();
  const normalizedValue = kind === "email" ? normalizeEmail(value) : normalizeUsername(value);

  await enforceRateLimit([
    { key: ip, limit: availabilityCheckIpRateLimit.limit.bind(availabilityCheckIpRateLimit) },
    {
      key: `${kind}:${normalizedValue}`,
      limit: availabilityCheckIdentityRateLimit.limit.bind(availabilityCheckIdentityRateLimit),
    },
  ]);
}

export async function enforceDestructiveActionRateLimit(userId: number) {
  const ip = await getClientIp();

  await enforceRateLimit([
    { key: ip, limit: destructiveActionIpRateLimit.limit.bind(destructiveActionIpRateLimit) },
    {
      key: String(userId),
      limit: destructiveActionUserRateLimit.limit.bind(destructiveActionUserRateLimit),
    },
  ]);
}
