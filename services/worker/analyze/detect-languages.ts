import { FileEntry } from "./scan-repository.js";

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".html": "HTML",
  ".htm": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "Sass",
  ".less": "Less",
  ".ts": "TypeScript",
  ".js": "JavaScript",
  ".py": "Python",
  ".go": "Go",
  ".java": "Java",
  ".cs": "C#",
  ".rb": "Ruby",
  ".php": "PHP",
  ".rs": "Rust",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".hpp": "C++",
  ".cc": "C++",
  ".cxx": "C++",
  ".hh": "C++",
  ".lua": "Lua",
  ".r": "R",
  ".jl": "Julia",
  ".sh": "Shell",
  ".kt": "Kotlin",
  ".swift": "Swift",
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
