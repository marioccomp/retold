
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

    const academicKeywords = [
        "disciplina", "trabalho", "atividade", "lista", "exercício", "exercicio", "assignment", "course",
        "university", "faculdade", "tarefa", "prova", "tp", "t1", "t2", "homework", "aula", "capitulo",
        "projeto", "challenge", "desafio"
    ];

    // Check README
    const foundAcademicInReadme = academicKeywords.filter(w => lowerReadme.includes(w));
    if (foundAcademicInReadme.length > 0) {
        purpose = "learning";
        signals.push(`README mentions academic terms: ${foundAcademicInReadme.slice(0, 3).join(", ")}`);
        confidence += 0.3;
    }

    // Check Repo URL / Name
    if (purpose === "unknown" && repoUrl) {
        const repoName = repoUrl.split("/").pop()?.toLowerCase() || "";
        const foundInName = academicKeywords.filter(w => repoName.includes(w));
        if (foundInName.length > 0) {
            purpose = "learning";
            signals.push(`Repo Name contains academic terms: ${foundInName.join(", ")}`);
            confidence += 0.4;
        }
    }

    // Check Folder Names (e.g. capitulo1, exercicios)
    if (purpose === "unknown") {
        const suspiciousFolders = files.filter(f => {
            const lowerPath = f.path.toLowerCase();
            return academicKeywords.some(w => lowerPath.includes(w));
        });
        if (suspiciousFolders.length > 0) {
            purpose = "learning";
            signals.push("Directory structure contains academic terms");
            confidence += 0.2;
        }
    }

    // Simple structure check for learning (e.g. just a main file and no infra)
    const hasSimpleStructure = files.length < 15 && files.some(f => f.name.match(/^main\.(c|cpp|rs|py|js|ts)$/i));
    if (hasSimpleStructure && !infra.hasCI && !infra.hasDocker) {
        if (purpose === "unknown") {
            purpose = "learning";
            signals.push("Simple project structure (few files, main entrypoint) suggests learning/script");
        }
    }

    // Check for research/academic paper signals
    if (purpose === "unknown") {
        const hasLatex = files.some(f => f.name.endsWith(".tex") || f.name === "paper.md");
        if (hasLatex || lowerReadme.includes("citation") || lowerReadme.includes("arxiv")) {
            purpose = "research";
            signals.push("Detected Research artifacts (LaTeX, citation, arxiv)");
        }
    }

    if (purpose === "unknown") {
        if (infra.hasCI || infra.hasDocker || files.length > 50) {
            purpose = "production";
        } else {
            purpose = "demo"; // Default fallback for untagged projects
        }
    }

    // --- Step 2: Detect Domain ---
    let domain: ProjectDomain = "unknown";

    const isWeb = stack.frameworks.some(f => ["react", "next", "vue", "svelte", "express", "nest", "django", "rails", "laravel", "fastapi"].includes(f.toLowerCase())) ||
        input.files.some(f => f.name === "package.json") && input.files.some(f => f.name.match(/next\.config|vite\.config|webpack\.config/));

    const systemsLangs = ["c", "c++", "rust", "go", "zig", "assembly"];
    const hasSystemsLang = stack.languages.some(l => systemsLangs.includes(l.toLowerCase())) || systemsLangs.includes(primaryLanguage.toLowerCase());

    // Systems: heuristic relaxed -> build files OR just many systems source files
    const hasBuildFile = files.some(f => ["Makefile", "CMakeLists.txt", "Cargo.toml", "go.mod"].includes(f.name));
    const systemsFilesCount = files.filter(f => [".c", ".cpp", ".h", ".hpp", ".rs", ".go"].includes(f.name.substring(f.name.lastIndexOf(".")).toLowerCase())).length;

    const isSystems = hasSystemsLang && (hasBuildFile || systemsFilesCount >= 1);

    const isData = stack.languages.some(l => ["python", "r", "julia"].includes(l.toLowerCase())) &&
        (files.some(f => f.name.endsWith(".ipynb")) || files.some(f => f.name === "requirements.txt" && lowerReadme.includes("pandas")));

    const isLibrary = files.some(f => f.path.includes("src/lib") || f.path.startsWith("lib/") || f.path.includes("include/")) &&
        !files.some(f => f.name === "index.html" || f.path.includes("pages/"));

    const isCli = files.some(f => f.path.includes("bin/") || f.path.includes("cmd/") || f.path.includes("cli"));

    if (isWeb) {
        domain = "web";
        signals.push("Detected Web Frameworks/Configs");
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
            else if (["javascript", "typescript", "html", "css"].includes(primaryLanguage.toLowerCase())) domain = "web";
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
    } else if (["javascript", "typescript", "php", "ruby"].includes(primLang)) {
        languageFamily = "web"; // Generic bucket for these, usually web-related
    } else if (["lua", "bash", "shell"].includes(primLang)) {
        languageFamily = "scripting";
    }

    // --- Step 4: Determine Maturity Expectation ---
    let maturityExpectation: MaturityExpectation = "medium";

    if (purpose === "learning" || purpose === "research") {
        maturityExpectation = "low";
    } else if (domain === "library" && (infra.hasTests || files.some(f => f.name.toLowerCase().includes("doc")))) {
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
        signals
    };
}
