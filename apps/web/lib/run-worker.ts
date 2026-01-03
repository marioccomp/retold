import { spawn } from "child_process";
import path from "path";

export function runAnalyzeWorker(payload: { projectId: Number; repoUrl: string }) {
  const workerPath = path.resolve(process.cwd(), "services/worker/index.ts");

  spawn("node", ["--loader", "tsx", workerPath, JSON.stringify(payload)], {
    detached: true,
    stdio: "ignore",
  }).unref();
}
