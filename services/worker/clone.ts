import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export async function cloneRepository(repoUrl: string, targetPath: string) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  await execAsync(`git clone --depth=1 ${repoUrl} ${targetPath}`);
}
