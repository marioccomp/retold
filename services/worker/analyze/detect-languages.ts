import { FileEntry } from "./scan-repository.js";

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".js": "JavaScript",
  ".py": "Python",
  ".go": "Go",
  ".java": "Java",
  ".cs": "C#",
  ".rb": "Ruby",
  ".php": "PHP",
  ".rs": "Rust",
};

export function detectLanguages(files: FileEntry[]) {
  const counts: Record<string, number> = {};

  for (const file of files) {
    const lang = EXTENSION_LANGUAGE_MAP[file.ext];
    if (!lang) continue;
    counts[lang] = (counts[lang] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}
