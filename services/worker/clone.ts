import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export async function cloneRepository(repoUrl: string, targetPath: string, token?: string) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
  let authenticatedUrl = repoUrl;
  if (token) {
    authenticatedUrl = repoUrl.replace("https://", `https://x-access-token:${token}@`);
  }
  await execAsync(`git clone --depth=50 ${authenticatedUrl} ${targetPath}`);
}
