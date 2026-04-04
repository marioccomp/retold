import { lastCommitQueue } from "@repo/queue";
import { QueueEvents } from "bullmq";
import { redisConnection } from "@repo/queue";

async function main() {
  const userId = 1; // <-- bota aqui um userId REAL do seu banco que tenha installation + projetos

  console.log("📤 Enviando job lastCommit...");

  const queueEvents = new QueueEvents("github-last-commit", {
    connection: redisConnection,
  });

  const job = await lastCommitQueue.add(
    "refresh-last-commit",
    { userId },
    {
      jobId: `lastCommit-${userId}`, // dedupe
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );

  console.log("⏳ Aguardando completar...", job.id);

  await new Promise<void>((resolve, reject) => {
    queueEvents.on("completed", ({ jobId }) => {
      if (jobId === job.id) resolve();
    });
    queueEvents.on("failed", ({ jobId, failedReason }) => {
      if (jobId === job.id) reject(new Error(failedReason));
    });
  });

  await queueEvents.close();
  console.log("✅ Job concluído!");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Falhou:", e);
  process.exit(1);
});
