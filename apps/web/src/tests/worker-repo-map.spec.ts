import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { classifyProject } from "../../../../services/worker/analyze/classify-project";
import { detectPublishableLibrary } from "../../../../services/worker/analyze/detect-packaging";
import { buildHygieneReport, isGeneratedSource } from "../../../../services/worker/analyze/repo-map/hygiene";
import {
  buildJvmClassIndex,
  expandRustUseTree,
  extractImports,
  parseLooseJson,
  ResolutionContext,
  resolveImport,
} from "../../../../services/worker/analyze/repo-map/imports";
import { addEdge, createGraph, pageRank } from "../../../../services/worker/analyze/repo-map/graph";
import { ciRunsTests, scoreMaturity } from "../../../../services/worker/analyze/repo-map/maturity";
import { detectModules, moduleOf } from "../../../../services/worker/analyze/repo-map/modules";
import { buildRepoMap } from "../../../../services/worker/analyze/repo-map/index";
import { scanRepository } from "../../../../services/worker/analyze/scan-repository";

function context(files: string[], overrides: Partial<ResolutionContext> = {}): ResolutionContext {
  return {
    files: new Set(files),
    aliases: [],
    workspacePackages: new Map(),
    goModules: [],
    jvmClasses: buildJvmClassIndex(files),
    ...overrides,
  };
}

describe("import extraction", () => {
  it("reads JS/TS imports, re-exports, require and dynamic import", () => {
    const code = `
      import a from "./a";
      import { b } from '../b.js';
      import type { C } from "@/c";
      export * from "./d";
      const e = require("e-lib");
      const f = await import("./f");
      import "./side-effect.css";
    `;
    expect(extractImports(code, "js")).toEqual(
      expect.arrayContaining(["./a", "../b.js", "@/c", "./d", "e-lib", "./f", "./side-effect.css"])
    );
  });

  it("reads Python absolute, relative and package-relative imports", () => {
    const code = "import os, app.config as cfg\nfrom .models import User\nfrom . import service, schemas\n";
    expect(extractImports(code, "python")).toEqual(
      expect.arrayContaining(["os", "app.config", ".models", ".service", ".schemas"])
    );
  });

  it("reads Go single and grouped imports", () => {
    const code = 'import "fmt"\nimport (\n  "strings"\n  cfg "github.com/acme/app/internal/config"\n)';
    expect(extractImports(code, "go")).toEqual(
      expect.arrayContaining(["fmt", "strings", "github.com/acme/app/internal/config"])
    );
  });

  it("reads C quoted and angle includes", () => {
    expect(extractImports('#include "util.h"\n#include <drivers/vga.h>\n', "c")).toEqual([
      "util.h",
      "<drivers/vga.h>",
    ]);
  });

  it("expands Rust use trees and mod declarations", () => {
    expect(expandRustUseTree("crate::{a::B,c::{D,E}}")).toEqual(["crate::a::B", "crate::c::D", "crate::c::E"]);
    expect(extractImports("mod search;\nuse crate::{printer::Printer, util};\nuse regex::Regex;", "rust")).toEqual(
      expect.arrayContaining(["mod:search", "crate::printer::Printer", "crate::util", "regex::Regex"])
    );
  });
});

describe("import resolution", () => {
  it("resolves JS relative imports, TS ESM .js specifiers and index files", () => {
    const ctx = context(["src/a.ts", "src/b.ts", "src/lib/index.ts", "index.js"]);
    expect(resolveImport("src/a.ts", "./b.js", "js", ctx)).toEqual({ kind: "internal", files: ["src/b.ts"] });
    expect(resolveImport("src/a.ts", "./lib", "js", ctx)).toEqual({ kind: "internal", files: ["src/lib/index.ts"] });
    expect(resolveImport("test/x.test.js", "..", "js", ctx)).toEqual({ kind: "internal", files: ["index.js"] });
  });

  it("resolves tsconfig path aliases and workspace packages, and classifies externals", () => {
    const ctx = context(["apps/web/src/lib/utils.ts", "packages/db/index.ts"], {
      aliases: [{ scopeDir: "apps/web", prefix: "@/", targets: ["apps/web/src"] }],
      workspacePackages: new Map([["@repo/db", "packages/db"]]),
    });
    expect(resolveImport("apps/web/src/page.tsx", "@/lib/utils", "js", ctx)).toEqual({
      kind: "internal",
      files: ["apps/web/src/lib/utils.ts"],
    });
    expect(resolveImport("apps/web/src/page.tsx", "@repo/db", "js", ctx)).toEqual({
      kind: "internal",
      files: ["packages/db/index.ts"],
    });
    expect(resolveImport("apps/web/src/page.tsx", "@tanstack/react-query/devtools", "js", ctx)).toEqual({
      kind: "external",
      name: "@tanstack/react-query",
    });
    expect(resolveImport("apps/web/src/page.tsx", "node:fs", "js", ctx)).toEqual({
      kind: "external",
      name: "node:builtin",
    });
  });

  it("resolves Python imports from the package root that contains the file", () => {
    const ctx = context(["backend/app/database.py", "backend/app/files/models.py", "backend/app/files/__init__.py"]);
    expect(resolveImport("backend/app/files/models.py", "app.database", "python", ctx)).toEqual({
      kind: "internal",
      files: ["backend/app/database.py"],
    });
    expect(resolveImport("backend/app/files/service.py", ".models", "python", ctx)).toEqual({
      kind: "internal",
      files: ["backend/app/files/models.py"],
    });
    expect(resolveImport("backend/app/main.py", "fastapi.routing", "python", ctx)).toEqual({
      kind: "external",
      name: "fastapi",
    });
  });

  it("resolves Go packages of the module to their files", () => {
    const ctx = context(["internal/config/config.go", "internal/config/config_test.go", "main.go"], {
      goModules: [{ modulePath: "github.com/acme/app", dir: "" }],
    });
    expect(resolveImport("main.go", "github.com/acme/app/internal/config", "go", ctx)).toEqual({
      kind: "internal",
      files: ["internal/config/config.go"],
    });
    expect(resolveImport("main.go", "fmt", "go", ctx)).toEqual({ kind: "external", name: "go:stdlib" });
  });

  it("resolves JVM classes, C headers via include dirs and Rust modules", () => {
    const ctx = context([
      "src/main/java/org/acme/model/Person.java",
      "include/drivers/vga.h",
      "src/kernel.c",
      "src/lib.rs",
      "src/printer.rs",
      "src/printer/json.rs",
    ]);
    expect(resolveImport("src/main/java/org/acme/App.java", "org.acme.model.Person", "jvm", ctx)).toEqual({
      kind: "internal",
      files: ["src/main/java/org/acme/model/Person.java"],
    });
    expect(resolveImport("src/kernel.c", "<drivers/vga.h>", "c", ctx)).toEqual({
      kind: "internal",
      files: ["include/drivers/vga.h"],
    });
    expect(resolveImport("src/kernel.c", "<stdint.h>", "c", ctx)).toEqual({ kind: "external", name: "c:system" });
    expect(resolveImport("src/lib.rs", "mod:printer", "rust", ctx)).toEqual({
      kind: "internal",
      files: ["src/printer.rs"],
    });
    expect(resolveImport("src/printer.rs", "self::json::Json", "rust", ctx)).toEqual({
      kind: "internal",
      files: ["src/printer/json.rs"],
    });
    expect(resolveImport("src/printer/json.rs", "crate::printer", "rust", ctx)).toEqual({
      kind: "internal",
      files: ["src/printer.rs"],
    });
  });

  it("parses tsconfig-style JSON without eating '/*' inside strings", () => {
    const tsconfig = `{
      // comment
      "compilerOptions": { "paths": { "@/*": ["./src/*"] }, },
      /* block comment */
    }`;
    expect(parseLooseJson(tsconfig)).toEqual({ compilerOptions: { paths: { "@/*": ["./src/*"] } } });
  });
});

describe("dependency graph", () => {
  it("ranks the file everything depends on first", () => {
    const graph = createGraph(["a.ts", "b.ts", "c.ts", "db.ts"]);
    addEdge(graph, "a.ts", "db.ts");
    addEdge(graph, "b.ts", "db.ts");
    addEdge(graph, "c.ts", "b.ts");
    const ranks = pageRank(graph);
    const ordered = [...ranks.entries()].sort((x, y) => y[1] - x[1]).map(([file]) => file);
    expect(ordered[0]).toBe("db.ts");
    expect([...ranks.values()].reduce((sum, r) => sum + r, 0)).toBeCloseTo(1, 6);
  });
});

describe("module detection", () => {
  const read = (contents: Record<string, string>) => (f: string) => contents[f] ?? null;

  it("uses declared pnpm workspaces", () => {
    const files = ["pnpm-workspace.yaml", "apps/web/src/a.ts", "packages/db/index.ts", "tools/x.ts"];
    const modules = detectModules(
      files,
      new Set(files.filter((f) => f.endsWith(".ts"))),
      read({ "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n  - \"packages/*\"\n" })
    );
    expect(modules).toEqual(["apps/web", "packages/db"]);
    expect(moduleOf("tools/x.ts", modules)).toBe(".");
  });

  it("does not split Maven/Gradle source sets into modules", () => {
    const files = ["pom.xml", "src/main/java/App.java", "src/test/java/AppTest.java"];
    expect(detectModules(files, new Set(files.filter((f) => f.endsWith(".java"))), () => null)).toEqual(["src"]);
  });

  it("splits a single src/ folder by feature", () => {
    const files = ["src/auth/a.py", "src/files/b.py"];
    expect(detectModules(files, new Set(files), () => null)).toEqual(["src/auth", "src/files"]);
  });
});

describe("hygiene and generated code", () => {
  it("flags committed dependencies, secrets and build output, but not test fixtures", () => {
    const report = buildHygieneReport([
      "node_modules/express/index.js",
      ".env",
      ".env.example",
      "tests/test_apps/.env",
      "certs/server.key",
      "out/A.class",
      "out/B.class",
      "out/C.class",
    ]);
    expect(report.flags.sort()).toEqual(["compiled-artifacts", "env-file", "node_modules", "private-key"]);
    expect(report.examples["env-file"]).toEqual([".env"]);
  });

  it("ignores one or two compiled files (fixtures)", () => {
    expect(buildHygieneReport(["fixtures/sample.jar", "lib/tool.so"]).flags).toEqual([]);
  });

  it("detects generated and minified sources", () => {
    expect(isGeneratedSource("src/api.ts", "// Code generated by protoc. DO NOT EDIT.\nexport {}")).toBe(true);
    expect(isGeneratedSource("public/app.js", `${"x".repeat(6000)}\n`)).toBe(true);
    expect(isGeneratedSource("src/app.ts", "export const a = 1;\n")).toBe(false);
  });
});

describe("measured maturity", () => {
  it("recognizes test steps in CI configs", () => {
    expect(ciRunsTests(["run: ${{ env.CARGO }} test --workspace"])).toBe(true);
    expect(ciRunsTests(["- name: Run tests\n  run: make ci"])).toBe(true);
    expect(ciRunsTests(["run: pnpm test:web:unit"])).toBe(true);
    expect(ciRunsTests(["run: npm run build"])).toBe(false);
  });

  it("scores a tested, linted, CI-checked project as high and a bare one as low", () => {
    const hygiene = buildHygieneReport([]);
    const high = scoreMaturity({
      sourceFiles: 100,
      testFiles: 30,
      ciProviders: ["github-actions"],
      ciConfigs: ["run: pnpm test"],
      lintTools: ["eslint"],
      typeChecked: true,
      containerized: true,
      readme: "## Getting started\n" + "x".repeat(1000),
      commitsAnalyzed: 50,
      contributors: 3,
      hygiene,
    });
    const low = scoreMaturity({
      sourceFiles: 10,
      testFiles: 0,
      ciProviders: [],
      ciConfigs: [],
      lintTools: [],
      typeChecked: false,
      containerized: false,
      readme: "",
      commitsAnalyzed: 3,
      contributors: 1,
      hygiene: buildHygieneReport(["node_modules/x/index.js"]),
    });
    expect(high.level).toBe("high");
    expect(low.level).toBe("low");
    expect(low.breakdown.find((b) => b.signal === "hygiene")?.evidence).toBe("committed: node_modules");
  });
});

describe("publishable library detection", () => {
  const reader = (contents: Record<string, string>) => (f: string) => contents[f] ?? null;

  it("distinguishes npm libraries from apps", () => {
    expect(
      detectPublishableLibrary(["package.json"], reader({ "package.json": '{"name":"is","exports":"./dist/index.js"}' }))
        .library
    ).toBe(true);
    expect(
      detectPublishableLibrary(
        ["package.json"],
        reader({ "package.json": '{"name":"app","main":"index.js","scripts":{"start":"node index.js"}}' })
      ).library
    ).toBe(false);
  });

  it("recognizes Go, Rust and Python libraries", () => {
    expect(
      detectPublishableLibrary(["go.mod", "command.go"], reader({ "command.go": "package cobra\n" })).library
    ).toBe(true);
    expect(
      detectPublishableLibrary(["go.mod", "main.go"], reader({ "main.go": "package main\n" })).library
    ).toBe(false);
    expect(detectPublishableLibrary(["Cargo.toml", "src/lib.rs"], reader({ "Cargo.toml": "[package]" })).library).toBe(
      true
    );
    expect(
      detectPublishableLibrary(["pyproject.toml", "manage.py"], reader({ "pyproject.toml": "[project]\n" })).library
    ).toBe(false);
  });
});

describe("classification with measured facts", () => {
  const base = {
    stack: { languages: ["Python"], frameworks: [], tools: [] },
    infra: { hasCI: true, hasDocker: false, hasTests: true },
    primaryLanguage: "Python",
    repoUrl: "https://github.com/acme/project",
  };
  const pyFiles = Array.from({ length: 20 }, (_, i) => ({ path: `pkg/m${i}.py`, name: `m${i}.py` }));

  it("uses the publishable-library signal for the domain", () => {
    expect(classifyProject({ ...base, files: pyFiles, readme: "", publishableLibrary: true }).domain).toBe("library");
  });

  it("does not call a project with CI 'research' just because it cites a paper", () => {
    const result = classifyProject({ ...base, files: pyFiles, readme: "## Citation\nSee arXiv:2309.06180" });
    expect(result.purpose).toBe("production");
  });

  it("reads 'sample application' only from the README intro", () => {
    const intro = classifyProject({ ...base, files: pyFiles, readme: "# Spring PetClinic Sample Application" });
    const deep = classifyProject({
      ...base,
      files: pyFiles,
      readme: `# Real Tool\n${"Real content. ".repeat(60)}\nSee the example app in /examples.`,
    });
    expect(intro.purpose).toBe("demo");
    expect(deep.purpose).toBe("production");
  });

  it("recognizes course material from the title or numbered lessons", () => {
    expect(
      classifyProject({ ...base, files: pyFiles, readme: "# Web Development for Beginners - A Curriculum" }).purpose
    ).toBe("learning");
    expect(classifyProject({ ...base, files: pyFiles, readme: "# Web\nEach of the 24 lessons covers..." }).purpose).toBe(
      "learning"
    );
    expect(classifyProject({ ...base, files: pyFiles, readme: "# Online Course Platform" }).purpose).toBe(
      "production"
    );
  });

  it("classifies notebook-heavy repositories as data, and a few HTML files don't make a web project", () => {
    const notebooks = Array.from({ length: 30 }, (_, i) => ({ path: `notebooks/${i}.ipynb`, name: `${i}.ipynb` }));
    expect(classifyProject({ ...base, files: [...notebooks, ...pyFiles.slice(0, 5)], readme: "" }).domain).toBe("data");

    const docsHtml = [{ path: "docs/_templates/layout.html", name: "layout.html" }];
    expect(
      classifyProject({
        ...base,
        stack: { languages: ["C"], frameworks: [], tools: [] },
        primaryLanguage: "C",
        files: [...docsHtml, ...Array.from({ length: 30 }, (_, i) => ({ path: `src/${i}.c`, name: `${i}.c` })), { path: "Makefile", name: "Makefile" }],
        readme: "",
      }).domain
    ).toBe("systems");
  });
});

describe("buildRepoMap on a real repository", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  });

  it("maps modules, central files, hygiene and maturity", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "retold-repomap-"));
    tempDirs.push(repo);
    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "retold-gitconfig-"));
    tempDirs.push(configDir);
    const gitConfig = path.join(configDir, "gitconfig");
    fs.writeFileSync(gitConfig, "");

    const write = (file: string, content: string) => {
      fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
      fs.writeFileSync(path.join(repo, file), content);
    };
    write("package.json", '{"name":"root","private":true}');
    write("pnpm-workspace.yaml", "packages:\n  - 'apps/*'\n  - 'packages/*'\n");
    write("packages/db/package.json", '{"name":"@acme/db"}');
    write("packages/db/index.ts", "export const db = {};\n");
    write("apps/web/package.json", '{"name":"web"}');
    write("apps/web/src/users.ts", 'import { db } from "@acme/db";\nexport const users = db;\n');
    write("apps/web/src/posts.ts", 'import { db } from "@acme/db";\nimport { users } from "./users";\n');
    write("apps/web/src/posts.test.ts", 'import "./posts";\n');
    write(".github/workflows/ci.yml", "jobs:\n  test:\n    steps:\n      - run: pnpm test\n");
    write(".env", "SECRET=1\n");
    write("README.md", "# Acme\n## Getting started\npnpm install\n");

    const git = (args: string[]) =>
      execFileSync("git", ["-C", repo, ...args], {
        env: {
          ...process.env,
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: gitConfig,
          GIT_AUTHOR_NAME: "Dev",
          GIT_AUTHOR_EMAIL: "dev@example.com",
          GIT_COMMITTER_NAME: "Dev",
          GIT_COMMITTER_EMAIL: "dev@example.com",
        },
        stdio: "pipe",
      });
    git(["init", "-q"]);
    git(["add", "."]);
    git(["commit", "-q", "-m", "init"]);

    const { files } = scanRepository(repo);
    const map = buildRepoMap({
      repoPath: repo,
      files,
      readme: fs.readFileSync(path.join(repo, "README.md"), "utf8"),
      primaryLanguage: "TypeScript",
      infra: { ciProviders: ["github-actions"], lintTools: [], hasDockerfile: false, hasCompose: false },
    });

    expect(map.modules.map((m) => m.path)).toEqual(["apps/web", "packages/db", "."]);
    expect(map.centralFiles[0].path).toBe("packages/db/index.ts");
    expect(map.centralFiles[0].fanIn).toBe(2);
    expect(map.modules.find((m) => m.path === "apps/web")?.dependsOn).toEqual(["packages/db"]);
    expect(map.hygiene.flags).toEqual(["env-file"]);
    expect(map.history).toEqual({ commitsAnalyzed: 1, contributors: 1 });
    expect(map.maturity.breakdown.find((b) => b.signal === "ci")?.evidence).toBe("github-actions running tests");
    // Test files are never listed as central files.
    expect(map.centralFiles.map((f) => f.path)).not.toContain("apps/web/src/posts.test.ts");
  });
});
