import { analysisQueue } from "@services/worker/queue";

type AnalyzePayload = {
  projectId: number;
  repoUrl: string;
};

export async function runAnalyzeWorker(payload: AnalyzePayload) {
  await analysisQueue.add("repository-analysis", payload, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
}
