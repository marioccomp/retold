import fs from "fs";
import { FileEntry } from "./scan-repository.js";
import { classifyFile } from "./classify-file.js";

export type CodeSample = {
  relativePath: string;
  language: string;
  excerpt: string;
  reason: string;
};

const CODE_EXTENSIONS = [
  ".c",
  ".cpp",
  ".cc",
  ".h",
  ".hpp",
  ".rs",
  ".go",
  ".py",
  ".js",
  ".ts",
  ".java",
  ".cs",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".lua",
  ".sh",
];

const IGNORED_PATHS = [
  "node_modules",
  "dist",
  "build",
  "target",
  "vendor",
  "coverage",
  ".next",
  "out",
  "bin",
  "obj",
  ".git",
  ".github",
  ".vscode",
];

export function selectCodeSamples(files: FileEntry[], limit = 2): CodeSample[] {
  // 1. Filter viable code files
  const codeFiles = files.filter((f) => {
    // Must be source code
    if (classifyFile(f) !== "source") return false;

    // Must have code extension
    if (!CODE_EXTENSIONS.includes(f.ext.toLowerCase())) return false;

    // Must not be in ignored paths
    if (IGNORED_PATHS.some((ip) => f.path.includes(ip))) return false;

    return true;
  });

  if (codeFiles.length === 0) return [];

  // 2. Score files to find best samples
  const scoredFiles = codeFiles.map((f) => {
    const rel = f.relativePath.toLowerCase();
    let score = 0;
    const name = f.name.toLowerCase();

    // entrypoints / bootstraps
    if (/(^|\/)(main|server|app|index)\.(ts|js|py|go|java)$/.test(rel)) score += 40;
    if (rel.includes("/src/") || rel.includes("/app/")) score += 10;

    // evita "barrel" muito vazio
    if (rel.endsWith("index.ts") || rel.endsWith("index.js")) score -= 5;

    // tamanho: evita monstros
    if (f.size > 200_000) score -= 20;
    if (f.size > 1_000_000) score -= 80;

    // Priority to main entrypoints
    if (name.startsWith("main.")) score += 10;
    if (name.startsWith("index.")) score += 5;
    if (name.startsWith("app.")) score += 5;
    if (name.startsWith("server.")) score += 5;

    // Priority to typical core files in C/Systems
    if (name.includes("game")) score += 3;
    if (name.includes("core")) score += 3;
    if (name.includes("lib")) score += 2;

    // Tie-breaker: file size (heuristic: prefer larger files but not massive)
    // We can't know size without stat, assuming we can rely on what we have or just path length?
    // We'll read specific stats if really needed, but here we can just assume list order or random if tied.
    // Let's rely on name matching for now.

    return { file: f, score };
  });

  // Sort by score descending
  scoredFiles.sort((a, b) => b.score - a.score);

  // If top scores are 0, maybe pick by file size if we had it, or just pick root files first
  if (scoredFiles.every((s) => s.score === 0)) {
    // Boost root files (shallower depth)
    scoredFiles.forEach((s) => {
      const depth = s.file.path.split(/[/\\]/).length;
      s.score -= depth; // Lower depth = higher score (less negative)
    });
    scoredFiles.sort((a, b) => b.score - a.score);
  }

  const selected = scoredFiles.slice(0, limit);

  return selected.map((s) => {
    let content = "";
    try {
      content = fs.readFileSync(s.file.path, "utf-8");
      // Basic truncation
      const lines = content.split("\n");
      if (lines.length > 250) {
        content = lines.slice(0, 250).join("\n") + "\n... (TRUNCATED)";
      }
    } catch (e) {
      content = "// Error reading file";
    }

    // Infer language from ext
    const lang = s.file.ext.replace(".", "").toUpperCase();

    return {
      relativePath: s.file.path, // Ideally should be relative, caller fixes it or we fix if we had root
      language: lang,
      excerpt: content,
      reason: s.score > 0 ? "Entrypoint / Core file" : "Source file",
    };
  });
}
