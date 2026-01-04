import { analysisQueue } from "./queue.js";

async function main() {
    console.log("📤 Enviando job...");

    await analysisQueue.add("repository-analysis", {
        projectId: 124124,
        repoUrl: "https://github.com/marioccomp/gym_notes_Project",
    });

    console.log("✅ Job enviado");
    process.exit(0);
}

main();
