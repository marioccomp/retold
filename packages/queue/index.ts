import { Queue, type JobsOptions, type QueueOptions } from "bullmq";
import { redisConnection } from "./redis";

export const SENSITIVE_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: {
    age: 15 * 60,
    count: 20,
  },
  removeOnFail: {
    age: 6 * 60 * 60,
    count: 10,
  },
  stackTraceLimit: 3,
};

export const STANDARD_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: {
    age: 60 * 60,
    count: 50,
  },
  removeOnFail: {
    age: 24 * 60 * 60,
    count: 25,
  },
  stackTraceLimit: 5,
};

function createQueue(name: string, defaultJobOptions: JobsOptions) {
  const options: QueueOptions = {
    connection: redisConnection,
    defaultJobOptions,
  };

  return new Queue(name, options);
}

// Central export for the shared queue used across the monorepo.
// Keeping it here avoids TS/ESM re-export resolution issues in consumers.
export const analyzeRepoQueue = createQueue("analyze-repo", SENSITIVE_JOB_OPTIONS);

export const userAnalyzeQueue = createQueue("user-analyze", SENSITIVE_JOB_OPTIONS);

export const lastCommitQueue = createQueue("github-last-commit", STANDARD_JOB_OPTIONS);

export * from "./redis";
