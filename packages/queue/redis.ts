import type { RedisOptions } from "bullmq";

function parseOptionalNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (!value) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function buildRedisConnection(): RedisOptions {
  const redisUrl = process.env.REDIS_URL?.trim();
  const defaultPort = Number(process.env.REDIS_PORT ?? 6379);
  const defaultHost = process.env.REDIS_HOST || "127.0.0.1";
  const defaultDb = parseOptionalNumber(process.env.REDIS_DB);

  let connection: RedisOptions;

  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);

    if (parsedUrl.protocol !== "redis:" && parsedUrl.protocol !== "rediss:") {
      throw new Error("REDIS_URL must use redis:// or rediss://");
    }

    const urlDatabase = parsedUrl.pathname ? parseOptionalNumber(parsedUrl.pathname.slice(1)) : undefined;

    connection = {
      host: parsedUrl.hostname || defaultHost,
      port: parsedUrl.port ? Number(parsedUrl.port) : defaultPort,
      username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
      password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
      db: urlDatabase ?? defaultDb,
    };

    if (parsedUrl.protocol === "rediss:") {
      connection.tls = {
        rejectUnauthorized: parseBoolean(process.env.REDIS_TLS_REJECT_UNAUTHORIZED, true),
      };
    }
  } else {
    connection = {
      host: defaultHost,
      port: defaultPort,
      username: process.env.REDIS_USERNAME || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      db: defaultDb,
    };

    if (parseBoolean(process.env.REDIS_TLS_ENABLED, false)) {
      connection.tls = {
        rejectUnauthorized: parseBoolean(process.env.REDIS_TLS_REJECT_UNAUTHORIZED, true),
      };
    }
  }

  if (process.env.NODE_ENV === "production" && !connection.password) {
    throw new Error(
      "Secure Redis configuration requires REDIS_PASSWORD or REDIS_URL credentials in production"
    );
  }

  return {
    ...connection,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    keepAlive: 10_000,
    connectionName: process.env.REDIS_CONNECTION_NAME || "retold-bullmq",
  };
}

export const redisConnection: RedisOptions = buildRedisConnection();
