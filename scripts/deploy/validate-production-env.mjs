import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);
const envFileIndex = argv.indexOf("--env-file");
const envFileArg = envFileIndex >= 0 ? argv[envFileIndex + 1] : ".env";
const envFile = path.resolve(process.cwd(), envFileArg ?? ".env");

if (!fs.existsSync(envFile)) {
  console.error(`[deploy] Missing env file: ${envFile}`);
  process.exit(1);
}

const source = fs.readFileSync(envFile, "utf8");

/** @type {Record<string, string>} */
const env = {};

for (const rawLine of source.split(/\r?\n/)) {
  const line = rawLine.trim();

  if (!line || line.startsWith("#")) {
    continue;
  }

  const match = rawLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

  if (!match) {
    continue;
  }

  const [, key, rawValue] = match;
  let value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  env[key] = value;
}

const errors = [];

function addError(message) {
  errors.push(message);
}

function isUnset(value) {
  return value == null || value.trim() === "";
}

function isPlaceholder(value) {
  if (isUnset(value)) {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  const exactPlaceholders = new Set([
    "123",
    "palavramuitosecretahere",
    "seuid",
    "seusecrethere",
    "suakey",
    "suakeyhere",
    "seuwebhooksecretaqui",
    "seu_token_aqui",
    "sua_chave_resend_aqui",
    "ov23liyc3cbtyjhtbq2r",
    "50f3830f8450f22decfadc5e5a4e2b1cee07912c",
    "minioadmin",
    "minioadmin123",
  ]);

  if (exactPlaceholders.has(normalized)) {
    return true;
  }

  return (
    normalized.includes("change_me") ||
    normalized.includes("replace_me") ||
    normalized.includes("your_") ||
    normalized.includes("your-") ||
    normalized.includes("yoursecret") ||
    normalized.includes("example") ||
    normalized.includes("dummy") ||
    normalized.includes("teste") ||
    normalized.includes("seu") ||
    normalized.includes("sua")
  );
}

function requireEnv(name) {
  const value = env[name];

  if (isUnset(value)) {
    addError(`${name} must be set in ${path.basename(envFile)}.`);
    return "";
  }

  return value.trim();
}

function requireNonPlaceholderSecret(name, { minLength = 16 } = {}) {
  const value = requireEnv(name);

  if (!value) {
    return;
  }

  if (isPlaceholder(value)) {
    addError(`${name} still contains a placeholder or historically unsafe default.`);
    return;
  }

  if (value.length < minLength) {
    addError(`${name} must be at least ${minLength} characters long.`);
  }
}

function requireUrl(name, { requireHttps = true } = {}) {
  const value = requireEnv(name);

  if (!value) {
    return;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    addError(`${name} must be a valid URL.`);
    return;
  }

  const isLocal =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1";

  if (!isLocal && requireHttps && parsed.protocol !== "https:") {
    addError(`${name} must use https outside local development.`);
  }

  if (isLocal) {
    addError(`${name} must not point to localhost during production deploy.`);
  }
}

function requireCsvOrigins(name) {
  const value = env[name];

  if (isUnset(value)) {
    return;
  }

  for (const item of value.split(",").map((entry) => entry.trim()).filter(Boolean)) {
    const candidate = item.includes("://") ? item : `https://${item}`;

    try {
      const parsed = new URL(candidate);
      const isLocal =
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "::1";

      if (isLocal || parsed.protocol !== "https:") {
        addError(
          `${name} entries must be public https origins or hosts. Invalid value: ${item}`,
        );
      }
    } catch {
      addError(`${name} contains an invalid origin or host: ${item}`);
    }
  }
}

function requirePostgresUrl(name) {
  const value = requireEnv(name);

  if (!value) {
    return;
  }

  if (!(value.startsWith("postgres://") || value.startsWith("postgresql://"))) {
    addError(`${name} must start with postgres:// or postgresql://`);
  }

  if (isPlaceholder(value)) {
    addError(`${name} still contains a placeholder or historically unsafe default.`);
  }
}

function requireGitHubPrivateKey(name) {
  const value = requireEnv(name);

  if (!value) {
    return;
  }

  if (isPlaceholder(value)) {
    addError(`${name} still contains a placeholder or historically unsafe default.`);
    return;
  }

  if (!value.includes("BEGIN PRIVATE KEY")) {
    addError(`${name} must contain a PEM private key.`);
  }
}

requirePostgresUrl("DATABASE_URL");
requireEnv("POSTGRES_USER");
requireEnv("POSTGRES_DB");
requireNonPlaceholderSecret("POSTGRES_PASSWORD", { minLength: 12 });
requireNonPlaceholderSecret("AUTH_SECRET", { minLength: 32 });
requireUrl("APP_URL");
requireCsvOrigins("ADDITIONAL_ALLOWED_ORIGINS");
requireUrl("UPSTASH_REDIS_REST_URL");
requireNonPlaceholderSecret("UPSTASH_REDIS_REST_TOKEN");
requireNonPlaceholderSecret("RESEND_API_KEY");
requireNonPlaceholderSecret("AUTH_GITHUB_ID", { minLength: 10 });
requireNonPlaceholderSecret("AUTH_GITHUB_SECRET");
requireNonPlaceholderSecret("GITHUB_LINK_CLIENT_ID", { minLength: 10 });
requireNonPlaceholderSecret("GITHUB_LINK_CLIENT_SECRET");
requireNonPlaceholderSecret("GITHUB_APP_ID", { minLength: 3 });
requireGitHubPrivateKey("GITHUB_PRIVATE_KEY");
requireNonPlaceholderSecret("GITHUB_WEBHOOK_SECRET");
requireEnv("REDIS_HOST");
requireEnv("REDIS_PORT");
requireNonPlaceholderSecret("GROQ_API_KEY");
requireEnv("MINIO_ENDPOINT");
requireEnv("MINIO_BUCKET");
requireUrl("MINIO_PUBLIC_URL", { requireHttps: true });
requireNonPlaceholderSecret("MINIO_ROOT_PASSWORD");
requireNonPlaceholderSecret("MINIO_ACCESS_KEY");
requireNonPlaceholderSecret("MINIO_SECRET_KEY");

if (errors.length > 0) {
  console.error("[deploy] Production env validation failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(`[deploy] Production env validation passed for ${envFile}`);
