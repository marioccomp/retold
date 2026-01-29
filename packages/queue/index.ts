import { Queue } from "bullmq";
import { redisConnection } from "./redis";

// Central export for the shared queue used across the monorepo.
// Keeping it here avoids TS/ESM re-export resolution issues in consumers.
export const analyzeRepoQueue = new Queue("analyze-repo", {
  connection: redisConnection,
});

export const userAnalyzeQueue = new Queue("user-analyze", {
  connection: redisConnection,
});

export const lastCommitQueue = new Queue("github-last-commit", {
  connection: redisConnection,
});

export * from "./redis";
