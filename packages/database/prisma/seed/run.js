// Local dev seeder. Populates the local Postgres database with a sanitized
// snapshot of production data (see data.json) so you can develop/test against
// realistic content instead of an empty database.
//
// Sanitized on export: GitHub OAuth tokens (Account.access_token/refresh_token/id_token)
// were stripped, and every non-null User.password was replaced with a bcrypt
// hash of "password123" — so you can log in locally as any seeded user.
//
// Safety: refuses to run unless DATABASE_URL points at localhost/127.0.0.1,
// since it TRUNCATEs every app table before reloading.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

if (!/localhost|127\.0\.0\.1/.test(DATABASE_URL)) {
  throw new Error(
    `Refusing to seed: DATABASE_URL does not look local (${DATABASE_URL}). This script truncates every table.`,
  );
}

const data = JSON.parse(readFileSync(path.resolve(__dirname, "data.json"), "utf8"));

const JSON_COLUMNS = new Set(["stack", "structure", "signals", "rawAnalysis", "lastCommit", "topLanguages"]);

/** @param {import('pg').Client} client */
async function insertRows(client, table, columns, rows) {
  if (!rows.length) return 0;

  const values = [];
  const rowPlaceholders = rows.map((row, rowIndex) => {
    const base = rowIndex * columns.length;
    for (const col of columns) {
      const value = row[col];
      values.push(JSON_COLUMNS.has(col) && value !== null ? JSON.stringify(value) : value);
    }
    return `(${columns.map((_, colIndex) => `$${base + colIndex + 1}`).join(", ")})`;
  });

  const sql = `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES ${rowPlaceholders.join(", ")}`;
  await client.query(sql, values);
  return rows.length;
}

async function resetSequence(client, table) {
  await client.query(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) + 1 FROM "${table}"), 1), false)`,
    [`"${table}"`],
  );
}

const ALL_TABLES = [
  "_ProjectToTag",
  "_CertificationToTag",
  "_ParticipationToTag",
  "Notification",
  "Comment",
  "Like",
  "ProjectView",
  "UserProjectStats",
  "RepositoryAnalysis",
  "Project",
  "Repository",
  "GithubAppInstallation",
  "GithubStats",
  "Account",
  "Certification",
  "Education",
  "Participation",
  "PasswordResetToken",
  "Follows",
  "Session",
  "VerificationToken",
  "User",
  "Tag",
];

const SEQUENCE_TABLES = [
  "Tag",
  "User",
  "Repository",
  "Project",
  "RepositoryAnalysis",
  "Account",
  "Certification",
  "Comment",
  "Education",
  "GithubAppInstallation",
  "GithubStats",
  "Notification",
  "Participation",
  "PasswordResetToken",
  "ProjectView",
  "UserProjectStats",
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    console.log("Truncating existing data...");
    await client.query(`TRUNCATE TABLE ${ALL_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);

    // Insert in FK dependency order.
    const plan = [
      ["Tag", ["id", "name"], data.tags],
      [
        "User",
        [
          "id",
          "email",
          "name",
          "password",
          "username",
          "emailVerified",
          "image",
          "bio",
          "createdAt",
          "plan",
          "role",
          "updatedAt",
          "title",
          "githubUrl",
          "linkedinUrl",
          "longBio",
          "skills",
          "websiteUrl",
          "cover",
          "phone",
          "rateLimitResetAt",
          "githubEmail",
          "contactEmail",
          "dailyAnalysisCount",
          "dailyAnalysisDate",
          "hasCompletedOnboarding",
          "sessionVersion",
        ],
        data.users,
      ],
      [
        "Repository",
        ["id", "githubId", "name", "fullName", "url", "private", "userId", "createdAt", "updatedAt", "isActive"],
        data.repositories,
      ],
      [
        "Project",
        [
          "id",
          "title",
          "description",
          "longerDescription",
          "createdAt",
          "userId",
          "updatedAt",
          "images",
          "repositoryId",
          "status",
          "isPinned",
          "views",
          "visibility",
          "featuredTagIds",
        ],
        data.projects,
      ],
      [
        "RepositoryAnalysis",
        ["id", "projectId", "appType", "stack", "structure", "signals", "createdAt", "rawAnalysis", "llmOverview"],
        data.repositoryAnalyses,
      ],
      [
        "Account",
        [
          "id",
          "userId",
          "type",
          "provider",
          "providerAccountId",
          "refresh_token",
          "access_token",
          "expires_at",
          "token_type",
          "scope",
          "id_token",
          "session_state",
        ],
        data.accounts,
      ],
      [
        "Certification",
        ["id", "title", "description", "createdAt", "updatedAt", "userId", "image", "credentialUrl", "issuedAt", "issuer"],
        data.certifications,
      ],
      ["Comment", ["id", "content", "createdAt", "updatedAt", "userId", "projectId", "parentId"], data.comments],
      [
        "Education",
        ["id", "degree", "institution", "startDate", "endDate", "userId", "createdAt", "updatedAt"],
        data.educations,
      ],
      ["Follows", ["followerId", "followingId", "createdAt"], data.follows],
      [
        "GithubAppInstallation",
        ["id", "installationId", "accountLogin", "accountType", "userId", "createdAt", "updatedAt"],
        data.githubAppInstallations,
      ],
      [
        "GithubStats",
        [
          "id",
          "userId",
          "lastCommit",
          "totalStars",
          "totalRepositories",
          "totalPRs",
          "topLanguages",
          "lastCommitFetchedAt",
          "updatedAt",
        ],
        data.githubStats,
      ],
      ["Like", ["userId", "projectId", "createdAt"], data.likes],
      [
        "Notification",
        ["id", "userId", "type", "sourceUserId", "projectId", "commentId", "read", "createdAt"],
        data.notifications,
      ],
      [
        "Participation",
        ["id", "title", "description", "images", "createdAt", "updatedAt", "userId"],
        data.participations,
      ],
      [
        "PasswordResetToken",
        ["id", "userId", "tokenHash", "expiresAt", "usedAt"],
        data.passwordResetTokens,
      ],
      ["ProjectView", ["id", "projectId", "userId", "ipAddress", "createdAt", "updatedAt"], data.projectViews],
      [
        "UserProjectStats",
        [
          "id",
          "userId",
          "projectId",
          "commitsCount",
          "linesAdded",
          "linesDeleted",
          "firstCommitDate",
          "lastCommitDate",
          "activeDays",
          "impactScore",
          "updatedAt",
        ],
        data.userProjectStats,
      ],
      ["_ProjectToTag", ["A", "B"], data.projectToTag],
    ];

    for (const [table, columns, rows] of plan) {
      const count = await insertRows(client, table, columns, rows);
      console.log(`  ${table}: ${count} rows`);
    }

    for (const table of SEQUENCE_TABLES) {
      await resetSequence(client, table);
    }

    await client.query("COMMIT");
    console.log("\nSeed complete. All seeded users have password: password123");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
