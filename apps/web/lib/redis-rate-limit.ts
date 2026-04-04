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