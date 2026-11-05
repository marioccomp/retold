export function detectAppType(input: {
  frameworks: string[];
  tools: string[];
  languages: string[];
  signals: {
    hasDockerfile: boolean;
    hasCI: boolean;
    hasCompose: boolean;
  };
}) {
  let frontendScore = 0;
  let backendScore = 0;

  const { frameworks, tools, languages, signals } = input;

  /* ================= FRONTEND ================= */

  if (frameworks.some((f) => ["React", "Next.js", "Vue", "Svelte"].includes(f))) {
    frontendScore += 3;
  }

  if (languages.some((language) => ["HTML", "CSS", "SCSS", "Sass", "Less"].includes(language))) {
    frontendScore += 2;
  }

  if (tools.some((tool) => ["Tailwind", "PostCSS", "Webpack", "Vite"].includes(tool))) {
    frontendScore += 1;
  }

  if (frameworks.includes("Next.js")) {
    frontendScore += 1;
    backendScore += 1; // Next pode ser fullstack
  }

  /* ================= BACKEND (Node) ================= */

  // Server frameworks (any language). Server-rendered ones (Adonis, Django, Rails,
  // Laravel, Spring) also produce pages: their frontend side comes from HTML/CSS
  // and frontend tooling below, which makes them Fullstack.
  const SERVER_FRAMEWORKS = [
    "Express",
    "NestJS",
    "AdonisJS",
    "FastAPI",
    "Django",
    "Flask",
    "Laravel",
    "Ruby on Rails",
    "Spring Boot",
    "Gin",
    "Echo",
    "Fiber",
    "Actix",
    "Axum",
    ".NET",
  ];
  if (frameworks.some((f) => SERVER_FRAMEWORKS.includes(f))) {
    backendScore += 3;
  }

  if (tools.includes("Prisma")) backendScore += 2;

  /* ================= BACKEND (Other languages) ================= */

  if (languages.includes("Python")) backendScore += 2;
  if (languages.includes("Java")) backendScore += 2;
  if (languages.includes("Go")) backendScore += 2;

  /* ===================== Infra signals ===================== */

  if (signals.hasDockerfile) backendScore += 1;
  if (signals.hasCI) backendScore += 1;

  /* ================= Decision ================= */

  if (frontendScore > 0 && backendScore > 0) return "Fullstack";
  if (frontendScore > backendScore) return "Frontend";
  if (backendScore > frontendScore) return "Backend";

  // Fallback for Systems/CLI
  if (languages.some((l) => ["C", "C++", "Rust", "Go"].includes(l)) && frontendScore === 0) {
    return "CLI / Console App";
  }

  return "Unknown";
}
