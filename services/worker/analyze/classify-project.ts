import path from "path";

export type ProjectDomain = "web" | "systems" | "data" | "academic" | "library" | "cli" | "unknown";
export type ProjectPurpose = "learning" | "research" | "production" | "demo" | "unknown";
export type LanguageFamily = "web" | "compiled" | "scientific" | "scripting" | "unknown";
export type MaturityExpectation = "low" | "medium" | "high";

export type ProjectClassification = {
  domain: ProjectDomain;
  purpose: ProjectPurpose;
  languageFamily: LanguageFamily;
  maturityExpectation: MaturityExpectation;
  confidence: number; // 0..1
  signals: string[];
};

export type FileEntry = {
  path: string;
  name: string;
};

interface ClassificationInput {
  files: FileEntry[];
  readme: string;
  stack: {
    languages: string[];
    frameworks: string[];
    tools: string[];
  };
  infra: {
    hasCI: boolean;
    hasDocker: boolean;
    hasTests: boolean;
  };
  primaryLanguage: string;
  repoUrl?: string;
}

export function classifyProject(input: ClassificationInput): ProjectClassification {
  const signals: string[] = [];
  let confidence = 0.5;

  const { files, readme, stack, infra, primaryLanguage, repoUrl } = input;
  const lowerReadme = readme.toLowerCase();

  // --- Step 1: Detect Purpose (Learning/Academic signals are strong overrides) ---
  let purpose: ProjectPurpose = "unknown";

  // README: matched as whole words/phrases (never substrings: "tp" used to match "http").
  const readmeAcademic = detectReadmeAcademicSignals(readme);
  if (readmeAcademic.isAcademic) {
    purpose = "learning";
    signals.push(`README academic signals: ${readmeAcademic.matches.slice(0, 3).join(", ")}`);
    confidence += 0.25;
  } else if (readmeAcademic.matches.length > 0) {
    // A single ambiguous hit (e.g. "university" may be the app's domain) is only a hint.
    signals.push(`README contains weak academic terms: ${readmeAcademic.matches.join(", ")}`);
    confidence += 0.05;
  }

  // Repo name: tokens like "tp1", "aula-03", "lista2", "homework" are reliable here.
  if (purpose === "unknown" && repoUrl) {
    const repoName = repoUrl.split("/").pop() ?? "";
    const foundInName = tokenize(repoName).filter(isAcademicNameToken);
    if (foundInName.length > 0) {
      purpose = "learning";
      signals.push(`Repo Name contains academic terms: ${foundInName.join(", ")}`);
      confidence += 0.4;
    }
  }

  // Folder names (e.g. aula01/, capitulo-3/, exercicios/)
  if (purpose === "unknown") {
    const academicFolders = new Set<string>();
    for (const f of files) {
      const segments = f.path.replace(/\\/g, "/").split("/").slice(0, -1);
      for (const segment of segments) {
        if (isAcademicFolderName(segment)) academicFolders.add(segment);
      }
    }
    if (academicFolders.size > 0) {
      purpose = "learning";
      signals.push(
        `Directory structure contains academic terms: ${[...academicFolders].slice(0, 3).join(", ")}`
      );
      confidence += 0.2;
    }
  }

  // Simple structure check for learning (e.g. just a main file and no infra)
  const hasSimpleStructure =
    files.length < 15 && files.some((f) => f.name.match(/^main\.(c|cpp|rs|py|js|ts)$/i));
  if (hasSimpleStructure && !infra.hasCI && !infra.hasDocker) {
    if (purpose === "unknown") {
      purpose = "learning";
      signals.push(
        "Simple project structure (few files, main entrypoint) suggests learning/script"
      );
    }
  }

  // Check for research/academic paper signals
  if (purpose === "unknown") {
    const hasLatex = files.some((f) => f.name.endsWith(".tex") || f.name === "paper.md");
    if (hasLatex || lowerReadme.includes("citation") || lowerReadme.includes("arxiv")) {
      purpose = "research";
      signals.push("Detected Research artifacts (LaTeX, citation, arxiv)");
    }
  }

  if (purpose === "unknown") {
    if (infra.hasCI || infra.hasDocker) {
      purpose = "production";
      signals.push("Infra signals (CI/Docker) suggest production intent");
      confidence += 0.1;
    } else if (files.length > 50) {
      purpose = "demo";
      signals.push("Larger repo without infra signals suggests demo/template");
    } else {
      purpose = "demo";
    }
  }

  // --- Step 2: Detect Domain ---
  let domain: ProjectDomain = "unknown";

  const lowerPaths = files.map((f) => f.path.toLowerCase().replace(/\\/g, "/"));
  const fw = stack.frameworks.map((f) => f.toLowerCase());
  const toolNames = stack.tools.map((t) => t.toLowerCase());

  const hasWebFramework =
    fw.some((f) => ["react", "next.js", "next", "vue", "svelte", "angular"].includes(f)) ||
    fw.some((f) =>
      ["express", "nestjs", "nest", "adonisjs", "django", "rails", "laravel", "fastapi"].includes(f)
    ) ||
    fw.some((f) => ["react native", "expo"].includes(f)); // mobile entra no bucket web do seu domain model

  const hasWebConfigs = files.some((f) =>
    /next\.config|vite\.config|webpack\.config/i.test(f.name)
  );

  const hasStaticWebFiles = files.some((f) =>
    /\.(html?|css|scss|sass|less)$/.test(f.name.toLowerCase())
  );

  const isWeb = hasWebFramework || hasWebConfigs || hasStaticWebFiles;

  const systemsLangs = ["c", "c++", "rust", "go", "zig", "assembly"];
  const hasSystemsLang =
    stack.languages.some((l) => systemsLangs.includes(l.toLowerCase())) ||
    systemsLangs.includes(primaryLanguage.toLowerCase());

  // Systems: heuristic relaxed -> build files OR just many systems source files
  const hasBuildFile = files.some((f) =>
    ["Makefile", "CMakeLists.txt", "Cargo.toml", "go.mod"].includes(f.name)
  );
  const systemsFilesCount = files.filter((f) =>
    [".c", ".cpp", ".h", ".hpp", ".rs", ".go"].includes(
      f.name.substring(f.name.lastIndexOf(".")).toLowerCase()
    )
  ).length;

  const isSystems = hasSystemsLang && (hasBuildFile || systemsFilesCount >= 1);

  const isData =
    stack.languages.some((l) => ["python", "r", "julia"].includes(l.toLowerCase())) &&
    (files.some((f) => f.name.endsWith(".ipynb")) ||
      files.some((f) => f.name === "requirements.txt" && lowerReadme.includes("pandas")));

  const hasLibraryDirs =
    lowerPaths.some((p) => p.includes("/src/lib/")) ||
    lowerPaths.some((p) => p.startsWith("lib/")) ||
    lowerPaths.some((p) => p.includes("/include/"));

  const hasAppEntrySignals =
    hasWebFramework ||
    hasWebConfigs ||
    lowerPaths.some((p) => p.includes("/apps/")) ||
    files.some((f) => /main\.(ts|js|py|go|java)$/i.test(f.name));

  const isLibrary = hasLibraryDirs && !hasAppEntrySignals;

  const hasCliDirs =
    lowerPaths.some((p) => p.includes("/bin/")) ||
    lowerPaths.some((p) => p.includes("/cmd/")) ||
    lowerPaths.some((p) => p.includes("/cli/"));

  const hasCliEntrypointHint =
    lowerReadme.includes("usage:") &&
    (lowerReadme.includes("install") ||
      lowerReadme.includes("cli") ||
      lowerReadme.includes("command"));

  const isCli =
    hasCliDirs &&
    (hasCliEntrypointHint || stack.tools.map((t) => t.toLowerCase()).includes("cobra"));

  if (isWeb) {
    domain = "web";
    signals.push("Detected web/mobile app signals (frameworks/configs/)");
    confidence += 0.1;
  } else if (isData) {
    domain = "data";
    signals.push("Detected Data Science files (notebooks, R, etc)");
  } else if (isSystems) {
    domain = "systems";
    signals.push("Detected Systems Programming languages and build files");
  } else if (isCli) {
    domain = "cli";
    signals.push("Detected CLI structure (bin/cmd folders)");
  } else if (isLibrary) {
    domain = "library";
    signals.push("Detected Library structure (lib/include, no app entry)");
  }

  // Fallback domain
  if (domain === "unknown") {
    if (purpose === "learning") {
      // If it's learning, we try to guess based on language alone
      if (["c", "c++", "rust", "go"].includes(primaryLanguage.toLowerCase())) domain = "systems";
      else if (["javascript", "typescript", "html", "css"].includes(primaryLanguage.toLowerCase()))
        domain = "web";
      else if (["python", "r", "julia"].includes(primaryLanguage.toLowerCase())) domain = "data";
    }
  }

  // --- Step 3: Detect Language Family ---
  let languageFamily: LanguageFamily = "unknown";
  const primLang = primaryLanguage.toLowerCase();

  if (["c", "c++", "rust", "go", "zig"].includes(primLang)) {
    languageFamily = "compiled";
  } else if (["python", "r", "julia"].includes(primLang)) {
    // Distinguish data vs scripting context based on domain
    languageFamily = domain === "data" ? "scientific" : "scripting";
  } else if (
    ["javascript", "typescript", "php", "ruby", "html", "css", "scss", "sass", "less"].includes(
      primLang
    )
  ) {
    languageFamily = "web"; // Generic bucket for these, usually web-related
  } else if (["lua", "bash", "shell"].includes(primLang)) {
    languageFamily = "scripting";
  }

  // --- Step 4: Determine Maturity Expectation ---
  let maturityExpectation: MaturityExpectation = "medium";

  if (purpose === "learning" || purpose === "research") {
    maturityExpectation = "low";
  } else if (
    domain === "library" &&
    (infra.hasTests || files.some((f) => f.name.toLowerCase().includes("doc")))
  ) {
    maturityExpectation = "medium";
  } else if (domain === "web" && infra.hasCI && infra.hasTests && infra.hasDocker) {
    maturityExpectation = "high";
  } else if (domain === "web" && !infra.hasCI && !infra.hasTests) {
    // Production web app without CI/Tests is questionable maturity, but if purpose detected as production, we expect more.
    // However, for the USER'S request: "se purpose = learning → low".
    // "caso contrário: medium" (default)
  }

  // Explicit overrides from user rules
  if (purpose === "learning" || purpose === "research") maturityExpectation = "low";

  return {
    domain,
    purpose,
    languageFamily,
    maturityExpectation,
    confidence: Math.min(confidence, 1.0),
    signals,
  };
}

// ---------------------------------------------------------------------------
// Academic signal detection helpers.
// All matching is done on whole tokens/phrases after accent stripping, never on
// raw substrings (substring matching made "tp" match "http" and "lista" match
// "realista", which classified almost every repository as a learning project).
// ---------------------------------------------------------------------------

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Splits text into lowercase, accent-free tokens. camelCase is split too. */
function tokenize(value: string) {
  return normalizeText(value.replace(/([a-z])([A-Z])/g, "$1 $2"))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Phrases that almost only appear when the repository is coursework. */
const README_ACADEMIC_PHRASES = [
  "trabalho pratico",
  "trabalho final",
  "trabalho academico",
  "trabalho da disciplina",
  "trabalho de conclusao",
  "lista de exercicios",
  "atividade avaliativa",
  "atividade da disciplina",
  "projeto academico",
  "projeto da disciplina",
  "projeto de faculdade",
  "projeto da faculdade",
  "course project",
  "class project",
  "school project",
  "university project",
  "college project",
  "homework assignment",
  "programming assignment",
];

/**
 * Words that hint at coursework but can also describe the app's domain
 * ("a university management system"). Two distinct hits are required.
 */
const README_ACADEMIC_WORDS = new Set([
  "disciplina",
  "homework",
  "assignment",
  "faculdade",
  "universidade",
  "university",
  "college",
  "semestre",
  "semester",
  "professor",
  "professora",
  "exercicio",
  "exercicios",
  "tcc",
  "bootcamp",
]);

export function detectReadmeAcademicSignals(readme: string): {
  isAcademic: boolean;
  matches: string[];
} {
  const tokens = tokenize(readme);
  if (tokens.length === 0) return { isAcademic: false, matches: [] };

  const padded = ` ${tokens.join(" ")} `;
  const phraseMatches = README_ACADEMIC_PHRASES.filter((phrase) =>
    padded.includes(` ${phrase} `)
  );
  const wordMatches = [...new Set(tokens.filter((t) => README_ACADEMIC_WORDS.has(t)))];

  return {
    isAcademic: phraseMatches.length > 0 || wordMatches.length >= 2,
    matches: [...phraseMatches, ...wordMatches],
  };
}

const ACADEMIC_NAME_WORDS = new Set([
  "tp",
  "ep",
  "trabalho",
  "atividade",
  "atividades",
  "exercicio",
  "exercicios",
  "lista",
  "listas",
  "aula",
  "aulas",
  "homework",
  "assignment",
  "assignments",
  "disciplina",
  "faculdade",
  "tcc",
  "semestre",
]);

// Note: a bare "t" prefix is intentionally excluded ("t3" is a popular stack name).
const NUMBERED_ACADEMIC_TOKEN =
  /^(tp|ep|hw|lab|aula|lista|atividade|exercicio|ex|trabalho|cap|capitulo|semana|week|chapter)\d+$/;

/** Token from a repository name, e.g. "tp1", "aula", "homework". */
export function isAcademicNameToken(token: string) {
  return ACADEMIC_NAME_WORDS.has(token) || NUMBERED_ACADEMIC_TOKEN.test(token);
}

/** Folder names that are coursework on their own, without a number. */
const ACADEMIC_FOLDER_WORDS = new Set([
  "exercicios",
  "exercises",
  "listas",
  "aulas",
  "atividades",
  "homework",
  "homeworks",
  "assignments",
]);

/** Folder words that only count when numbered ("aula-01", "lista 2", "capitulo3"). */
const NUMBERED_FOLDER_WORDS = new Set([
  "aula",
  "lista",
  "exercicio",
  "exercise",
  "capitulo",
  "chapter",
  "cap",
  "atividade",
  "semana",
  "week",
  "tp",
  "ep",
  "lab",
  "hw",
  "assignment",
]);

export function isAcademicFolderName(segment: string) {
  const tokens = tokenize(segment);
  if (tokens.length === 0) return false;
  if (tokens.some((t) => ACADEMIC_FOLDER_WORDS.has(t))) return true;
  if (tokens.some((t) => NUMBERED_ACADEMIC_TOKEN.test(t))) return true;

  const hasNumber = tokens.some((t) => /^\d+$/.test(t));
  return hasNumber && tokens.some((t) => NUMBERED_FOLDER_WORDS.has(t));
}
