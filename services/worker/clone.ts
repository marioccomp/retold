import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

type GitCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

type GitAuthHelper = {
  env: NodeJS.ProcessEnv;
  cleanup: () => void;
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

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(createGitCommandError(stderr, code));
    });
  });
}

function createGitAskPassHelper(token: string): GitAuthHelper {
  const helperDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "retold-git-auth-"));
  const isWindows = process.platform === "win32";
  const helperPath = path.join(helperDirectory, isWindows ? "git-askpass.cmd" : "git-askpass.sh");

  const helperScript = isWindows
    ? [
        "@echo off",
        "set PROMPT_TEXT=%~1",
        'echo %PROMPT_TEXT% | findstr /I "Username" >nul',
        "if %ERRORLEVEL%==0 (",
        "  echo %RETOLD_GIT_USERNAME%",
        ") else (",
        "  echo %RETOLD_GIT_PASSWORD%",
        ")",
      ].join("\r\n")
    : [
        "#!/bin/sh",
        'case "$1" in',
        '  *Username*) printf "%s\\n" "$RETOLD_GIT_USERNAME" ;;',
        '  *) printf "%s\\n" "$RETOLD_GIT_PASSWORD" ;;',
        "esac",
      ].join("\n");

  fs.writeFileSync(helperPath, helperScript, {
    encoding: "utf8",
    mode: 0o700,
  });

  return {
    env: {
      GIT_TERMINAL_PROMPT: "0",
      GIT_ASKPASS: helperPath,
      RETOLD_GIT_USERNAME: "x-access-token",
      RETOLD_GIT_PASSWORD: token,
    },
    cleanup() {
      fs.rmSync(helperDirectory, { recursive: true, force: true });
    },
  };
}

export async function cloneRepository(repoUrl: string, targetPath: string, token?: string) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  const authHelper = token ? createGitAskPassHelper(token) : null;

  try {
    await runGitCommand(["clone", "--depth=50", repoUrl, targetPath], {
      env: authHelper?.env,
    });
  } finally {
    authHelper?.cleanup();
  }
}
