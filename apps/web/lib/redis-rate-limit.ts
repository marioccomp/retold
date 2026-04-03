import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

//limitei a 10 tentativas por minuto para testes. Estudar qual o padrao utilizado (isso vale para todos os outros)
export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), 
  prefix: "login:ip",
});

export const bruteForceRateLimit = new Ratelimit ({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "login:brute",
});

export const protectionRateLimit = new Ratelimit ({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 h"),
  prefix: "login:protect",
});

export const registerIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "register:ip",
});

export const registerEmailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "register:email",
});

export const registerUsernameRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, "1 h"),
  prefix: "register:username",
});

export const forgotPasswordIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "forgot-password:ip",
});

export const forgotPasswordIdentityRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "forgot-password:identity",
});

export const availabilityCheckIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "10 m"),
  prefix: "availability-check:ip",
});

export const availabilityCheckIdentityRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "30 m"),
  prefix: "availability-check:identity",
});

export const destructiveActionIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "danger-zone:ip",
});

export const destructiveActionUserRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "danger-zone:user",
});
