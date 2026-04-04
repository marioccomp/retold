import { lastCommitQueue } from "@repo/queue";
import { QueueEvents } from "bullmq";
import { redisConnection } from "@repo/queue";
import { createLogger } from "@repo/observability";

const logger = createLogger("worker.test-enqueue");

async function main() {
  const userId = 1; // <-- bota aqui um userId REAL do seu banco que tenha installation + projetos

  logger.info("worker.test_job_enqueued");

  const queueEvents = new QueueEvents("github-last-commit", {
    connection: redisConnection,
  });

  const job = await lastCommitQueue.add(
    "refresh-last-commit",
    { userId },
    {
      jobId: `lastCommit-${userId}`, // dedupe
    }
  );

  logger.info("worker.test_job_waiting", { jobId: job.id });

  await new Promise<void>((resolve, reject) => {
    queueEvents.on("completed", ({ jobId }) => {
      if (jobId === job.id) resolve();
    });
    queueEvents.on("failed", ({ jobId, failedReason }) => {
      if (jobId === job.id) reject(new Error(failedReason));
    });
  });

  await queueEvents.close();
  logger.info("worker.test_job_completed", { jobId: job.id });
  process.exit(0);
}

main().catch((e) => {
  logger.error("worker.test_job_failed", e);
  process.exit(1);
});
