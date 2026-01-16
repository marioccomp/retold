import { analyzeRepoQueue } from "@repo/queue";

async function main() {
  console.log("📤 Enviando job...");

  await analyzeRepoQueue.add("repository-analysis", {
    projectId: 4,
    repoUrl: "https://github.com/marioccomp/backend-gps-challenge-spring-boot",
  });

  console.log("✅ Job enviado");
  process.exit(0);
}

main();
