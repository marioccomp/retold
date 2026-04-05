import { analyzeRepoQueue, lastCommitQueue } from "@repo/queue";

export async function removeQueueJob(jobId: string, queue: typeof analyzeRepoQueue) {
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}

export async function cleanupAnalysisJob(projectId: number) {
  await removeQueueJob(`project-analysis-${projectId}`, analyzeRepoQueue);
}

export async function cleanupLastCommitJob(userId: number) {
  await removeQueueJob(`lastCommit-${userId}`, lastCommitQueue);
}
