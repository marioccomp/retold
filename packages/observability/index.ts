export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

type LoggerOptions = {
  defaultContext?: LogContext;
  includeStack?: boolean;
  minLevel?: LogLevel;
};

type ErrorLike = Error & {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  cause?: unknown;
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|token|secret|password|passwd|session|signature|privatekey|private_key|accesskey|access_key|apikey|api_key|credential|clientsecret|client_secret|refresh)/i;
const CONTENT_KEY_PATTERN =
  /(payload|body|headers|cookies|formdata|html|markdown|content|raw|readme|code|prompt|response|request|diff|patch)/i;
const PII_KEY_PATTERN = /(email|phone|contactemail|contact_email|ip|ipaddress|ip_address)/i;

const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 10;
const MAX_OBJECT_KEYS = 20;
const MAX_STRING_LENGTH = 180;
const STACK_LINE_LIMIT = 6;

function normalizeKey(key?: string): string {
  return key?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ?? "";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function truncateText(value: string, maxLength = MAX_STRING_LENGTH): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...[truncated:${value.length}]`;
}

function maskEmail(value: string): string {
  const [localPart, domain] = value.split("@");
  if (!localPart || !domain) return "[REDACTED_EMAIL]";

  const visibleLocal =
    localPart.length <= 2 ? `${localPart[0] ?? "*"}*` : `${localPart.slice(0, 2)}***`;
  const [domainName, ...suffixParts] = domain.split(".");
  const maskedDomain = domainName ? `${domainName.slice(0, 1)}***` : "***";
  const suffix = suffixParts.length > 0 ? `.${suffixParts.join(".")}` : "";

  return `${visibleLocal}@${maskedDomain}${suffix}`;
}

function maskIp(value: string): string {
  if (value.includes(":")) {
    const parts = value.split(":").filter(Boolean);
    if (parts.length === 0) return "[REDACTED_IP]";
    return `${parts.slice(0, 2).join(":")}::*`;
  }

  const parts = value.split(".");
  if (parts.length !== 4) return "[REDACTED_IP]";
  return `${parts[0]}.${parts[1]}.*.*`;
}

function redactSecretPatterns(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    .replace(/\bgh[pousr]_[A-Za-z0-9_]+\b/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[REDACTED_JWT]"
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => maskEmail(email));
}

function summarizeCollection(
  label: string,
  keys: string[],
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return {
    summary: `${label} omitted`,
    keyCount: keys.length,
    keys: keys.slice(0, MAX_ARRAY_ITEMS),
    ...(extra ?? {}),
  };
}

function sanitizeString(value: string, keyHint?: string): string {
  const normalizedKey = normalizeKey(keyHint);
  const redactedValue = redactSecretPatterns(value);

  if (SENSITIVE_KEY_PATTERN.test(normalizedKey)) {
    return "[REDACTED]";
  }

  if (CONTENT_KEY_PATTERN.test(normalizedKey) && normalizedKey !== "message") {
    return `[OMITTED:${value.length}]`;
  }

  if (PII_KEY_PATTERN.test(normalizedKey)) {
    if (normalizedKey.includes("email")) return maskEmail(redactedValue);
    if (normalizedKey.includes("ip")) return maskIp(redactedValue);
  }

  return truncateText(redactedValue);
}

function sanitizeHeadersValue(value: Headers): Record<string, unknown> {
  return summarizeCollection("headers", Array.from(value.keys()));
}

function sanitizeFormDataValue(value: FormData): Record<string, unknown> {
  return summarizeCollection("form-data", Array.from(new Set(Array.from(value.keys()))));
}

function sanitizeUrlSearchParamsValue(value: URLSearchParams): Record<string, unknown> {
  return summarizeCollection("search-params", Array.from(new Set(Array.from(value.keys()))));
}

function sanitizeArray(
  value: unknown[],
  seen: WeakSet<object>,
  depth: number,
  keyHint?: string
): unknown {
  if (CONTENT_KEY_PATTERN.test(normalizeKey(keyHint))) {
    return {
      summary: "array omitted",
      itemCount: value.length,
    };
  }

  const items = value
    .slice(0, MAX_ARRAY_ITEMS)
    .map((item) => sanitizeForLog(item, undefined, seen, depth + 1));

  if (value.length > MAX_ARRAY_ITEMS) {
    items.push(`[TRUNCATED_ITEMS:${value.length - MAX_ARRAY_ITEMS}]`);
  }

  return items;
}

function sanitizeObject(
  value: Record<string, unknown>,
  seen: WeakSet<object>,
  depth: number,
  keyHint?: string
): unknown {
  if (CONTENT_KEY_PATTERN.test(normalizeKey(keyHint))) {
    return summarizeCollection("object", Object.keys(value));
  }

  const entries = Object.entries(value);
  const sanitized: Record<string, unknown> = {};

  for (const [index, [key, nestedValue]] of entries.entries()) {
    if (index >= MAX_OBJECT_KEYS) {
      sanitized.truncatedKeys = entries.length - MAX_OBJECT_KEYS;
      break;
    }

    sanitized[key] = sanitizeForLog(nestedValue, key, seen, depth + 1);
  }

  return sanitized;
}

export function sanitizeForLog(
  value: unknown,
  keyHint?: string,
  seen = new WeakSet<object>(),
  depth = 0
): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return sanitizeString(value, keyHint);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof URL) {
    return sanitizeString(value.toString(), keyHint);
  }

  if (typeof Headers !== "undefined" && value instanceof Headers) {
    return sanitizeHeadersValue(value);
  }

  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return sanitizeFormDataValue(value);
  }

  if (value instanceof URLSearchParams) {
    return sanitizeUrlSearchParamsValue(value);
  }

  if (Array.isArray(value)) {
    return sanitizeArray(value, seen, depth, keyHint);
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (typeof value === "object") {
    if (depth >= MAX_DEPTH) {
      if (isPlainObject(value)) {
        return summarizeCollection("object", Object.keys(value));
      }

      return `[${value.constructor?.name ?? "Object"}]`;
    }

    if (seen.has(value)) {
      return "[CIRCULAR]";
    }

    seen.add(value);

    try {
      if (isPlainObject(value)) {
        return sanitizeObject(value, seen, depth, keyHint);
      }

      if ("toJSON" in value && typeof value.toJSON === "function") {
        return sanitizeForLog(value.toJSON(), keyHint, seen, depth + 1);
      }

      return `[${value.constructor?.name ?? "Object"}]`;
    } finally {
      seen.delete(value);
    }
  }

  return String(value);
}

export function serializeError(
  error: unknown,
  options?: {
    includeStack?: boolean;
  }
): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {
      message: "Non-error thrown",
      value: sanitizeForLog(error, "error"),
    };
  }

  const errorLike = error as ErrorLike;
  const includeStack = options?.includeStack ?? process.env.NODE_ENV !== "production";
  const serialized: Record<string, unknown> = {
    name: sanitizeString(errorLike.name || "Error", "errorName"),
    message: sanitizeString(errorLike.message || "Unknown error", "message"),
  };

  if (typeof errorLike.code === "string" || typeof errorLike.code === "number") {
    serialized.code = sanitizeForLog(errorLike.code, "errorCode");
  }

  const status = errorLike.status ?? errorLike.statusCode;
  if (typeof status === "string" || typeof status === "number") {
    serialized.status = sanitizeForLog(status, "status");
  }

  if (includeStack && errorLike.stack) {
    serialized.stack = errorLike.stack
      .split("\n")
      .slice(0, STACK_LINE_LIMIT)
      .map((line) => sanitizeString(line, "stack"))
      .join("\n");
  }

  if (errorLike.cause !== undefined) {
    serialized.cause = serializeError(errorLike.cause, { includeStack: false });
  }

  return serialized;
}

function resolveMinLevel(explicitLevel?: LogLevel): LogLevel {
  if (explicitLevel) return explicitLevel;

  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (
    envLevel === "debug" ||
    envLevel === "info" ||
    envLevel === "warn" ||
    envLevel === "error"
  ) {
    return envLevel;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

function getConsoleMethod(level: LogLevel): "debug" | "info" | "warn" | "error" {
  return level;
}

function writeLog(level: LogLevel, payload: Record<string, unknown>) {
  console[getConsoleMethod(level)](JSON.stringify(payload));
}

export function createLogger(service: string, options?: LoggerOptions) {
  const minLevel = resolveMinLevel(options?.minLevel);

  const emit = (
    level: LogLevel,
    event: string,
    context?: LogContext,
    error?: unknown
  ) => {
    if (!shouldLog(level, minLevel)) {
      return;
    }

    const mergedContext = {
      ...(options?.defaultContext ?? {}),
      ...(context ?? {}),
    };

    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service,
      event,
    };

    if (Object.keys(mergedContext).length > 0) {
      payload.context = sanitizeForLog(mergedContext, "context");
    }

    if (error !== undefined) {
      payload.error = serializeError(error, {
        includeStack: options?.includeStack,
      });
    }

    writeLog(level, payload);
  };

  return {
    debug(event: string, context?: LogContext) {
      emit("debug", event, context);
    },
    info(event: string, context?: LogContext) {
      emit("info", event, context);
    },
    warn(event: string, context?: LogContext, error?: unknown) {
      emit("warn", event, context, error);
    },
    error(event: string, error?: unknown, context?: LogContext) {
      emit("error", event, context, error);
    },
  };
}
