/**
 * Is the repository a publishable library (as opposed to an application)?
 * Decided from root manifests, which state it explicitly:
 *   - npm: not private, declares an entry (main/exports/module/types), no start/dev script
 *   - Go: go.mod at the root and no `package main` at the root nor a cmd/ directory
 *   - Rust: src/lib.rs without src/main.rs nor [[bin]] targets
 *   - Python: packaged (pyproject [project]/[tool.poetry] or setup.py), not a Django site
 */
import { parseLooseJson } from "./repo-map/imports.js";

export function detectPublishableLibrary(
  filePaths: string[],
  read: (filePath: string) => string | null
): { library: boolean; reason?: string } {
  const files = new Set(filePaths);

  if (files.has("package.json")) {
    const pkg = parseLooseJson(read("package.json") ?? "") as {
      private?: boolean;
      main?: string;
      exports?: unknown;
      module?: string;
      types?: string;
      scripts?: Record<string, string>;
    } | null;
    if (pkg) {
      const declaresEntry = Boolean(pkg.main || pkg.exports || pkg.module || pkg.types);
      const runsAsApp = Boolean(pkg.scripts?.start || pkg.scripts?.dev);
      if (pkg.private !== true && declaresEntry && !runsAsApp) {
        return { library: true, reason: "package.json declares a public entry point" };
      }
      return { library: false };
    }
  }

  if (files.has("go.mod")) {
    const rootGoFiles = filePaths.filter((f) => !f.includes("/") && f.endsWith(".go"));
    const rootIsMain = rootGoFiles.some((f) => /^\s*package\s+main\b/m.test(read(f) ?? ""));
    const hasCmd = filePaths.some((f) => f.startsWith("cmd/"));
    if (rootGoFiles.length > 0 && !rootIsMain && !hasCmd) {
      return { library: true, reason: "Go module without a main package" };
    }
    return { library: false };
  }

  if (files.has("Cargo.toml")) {
    const cargo = read("Cargo.toml") ?? "";
    if (files.has("src/lib.rs") && !files.has("src/main.rs") && !/\[\[bin\]\]/.test(cargo)) {
      return { library: true, reason: "Rust crate with a library target only" };
    }
    return { library: false };
  }

  const pyproject = files.has("pyproject.toml") ? read("pyproject.toml") ?? "" : "";
  const packagedPython = /^\[(project|tool\.poetry)\]/m.test(pyproject) || files.has("setup.py");
  if (packagedPython && !files.has("manage.py")) {
    return { library: true, reason: "packaged Python distribution" };
  }

  return { library: false };
}
