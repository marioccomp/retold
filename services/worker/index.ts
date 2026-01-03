import path from "path";
import fs from "fs";
import { cloneRepository } from "./clone.js";
import { analyzeRepository } from "./analyze/index.js";

async function run() {
  const raw = process.argv[2];

  if (!raw) {
    throw new Error("Missing payload");
  }

  const payload = JSON.parse(raw);

  const { projectId, repoUrl } = payload;

  const tmpPath = path.resolve("/tmp/retold", projectId);

  try {
    console.log(`[worker] analyzing project ${projectId}`);

    // TODO: update project status -> analyzing

    await cloneRepository(repoUrl, tmpPath);
    const analysis = analyzeRepository(tmpPath);

    // TODO: save analysis in DB

    // TODO: update project status -> done
  } catch (err) {
    console.error(err);
    // TODO: update project status -> error
  } finally {
    fs.rmSync(tmpPath, { recursive: true, force: true });
  }
}

run();
