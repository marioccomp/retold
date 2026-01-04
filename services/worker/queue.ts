import { Queue } from "bullmq";
import { redisConnection } from "../../packages/queue/redis.js";

export const analysisQueue = new Queue("analyze-repo", {
  connection: redisConnection,
});
