import { redisConnection } from "./redis";
import { Queue } from "bullmq";

export const analyzeRepoQueue = new Queue("analyze-repo", {
  connection: redisConnection,
});
