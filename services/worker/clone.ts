import { spawn } from "child_process";
import fs from "fs";

type GitCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

type GitAuthHelper = {
  env: NodeJS.ProcessEnv;
};

function createGitCommandError(stderr: string, exitCode: number | null) {
  const normalizedError = stderr.toLowerCase();

  if (
    normalizedError.includes("authentication failed") ||
    normalizedError.includes("could not read username") ||
    normalizedError.includes("repository not found")
  ) {
    return Object.assign(new Error("Git clone authentication failed"), {
      code: "GIT_AUTH_FAILED",
      exitCode,
    });
  }

  if (normalizedError.includes("not found")) {
    return Object.assign(new Error("Git repository not found"), {
      code: "GIT_REPOSITORY_NOT_FOUND",
      exitCode,
    });
  }

  return Object.assign(new Error("Git command failed"), {
    code: "GIT_COMMAND_FAILED",
    exitCode,
  });
}

function createGitTimeoutError(timeoutMs: number) {
  return Object.assign(new Error(`Git command timed out after ${timeoutMs}ms`), {
    code: "GIT_COMMAND_TIMEOUT",
    exitCode: null,
  });
}

export async function runGitCommand(args: string[], options: GitCommandOptions = {}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...(options.env ?? {}),
      },
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    let timedOut = false;
    const timeoutMs = options.timeoutMs ?? 45_000;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(createGitTimeoutError(timeoutMs));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(createGitCommandError(stderr, code));
    });
  });
}

function createGitAuthEnvironment(token: string): GitAuthHelper {
  const basicAuth = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");

  return {
    env: {
      GIT_TERMINAL_PROMPT: "0",
      GCM_INTERACTIVE: "Never",
      GIT_CONFIG_COUNT: "2",
      GIT_CONFIG_KEY_0: "credential.helper",
      GIT_CONFIG_VALUE_0: "",
      GIT_CONFIG_KEY_1: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_1: `AUTHORIZATION: basic ${basicAuth}`,
    },
  };
}

export async function cloneRepository(repoUrl: string, targetPath: string, token?: string) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  const authHelper = token ? createGitAuthEnvironment(token) : null;

  await runGitCommand(["clone", "--depth=50", repoUrl, targetPath], {
    env: authHelper?.env,
  });
}
