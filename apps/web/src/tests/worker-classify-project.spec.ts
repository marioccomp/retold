import { describe, expect, it } from "vitest";

import {
  classifyProject,
  detectReadmeAcademicSignals,
  isAcademicFolderName,
  isAcademicNameToken,
} from "../../../../services/worker/analyze/classify-project";

const productionLikeInput = {
  stack: { languages: ["TypeScript"], frameworks: ["Next.js", "NestJS"], tools: ["Prisma"] },
  infra: { hasCI: true, hasDocker: true, hasTests: true },
  primaryLanguage: "TypeScript",
  files: Array.from({ length: 120 }, (_, i) => ({
    path: `apps/api/src/modules/module-${i}.ts`,
    name: `module-${i}.ts`,
  })),
};

function classify(overrides: { readme?: string; repoUrl?: string; files?: { path: string; name: string }[] }) {
  return classifyProject({
    ...productionLikeInput,
    readme: overrides.readme ?? "",
    repoUrl: overrides.repoUrl ?? "https://github.com/acme/shop-api",
    files: overrides.files ?? productionLikeInput.files,
  });
}

describe("classifyProject — purpose detection", () => {
  it.each([
    ["a README with a link", "# Retold\nA social portfolio. See https://retold.dev"],
    ["a README with an http badge", "[![CI](http://img.shields.io/badge.svg)](http://ci.example.com)"],
    ["'realista' (contains 'lista')", "Uma simulação realista de pagamentos."],
    ["'output' (contains 'tp')", "Configure the output directory with caching."],
    ["'aprovação' (contains 'prova')", "Fluxo de aprovação de pedidos com filas."],
    ["'of course'", "Of course, the API is fully typed."],
    ["a todo app ('tarefa', 'lista')", "Gerencie sua lista de tarefas com lembretes."],
    ["a university domain app", "A university management system for enrollments."],
  ])("does not classify %s as learning", (_label, readme) => {
    const result = classify({ readme });
    expect(result.purpose).toBe("production");
    expect(result.maturityExpectation).not.toBe("low");
  });

  it.each([
    ["an academic phrase", "Trabalho prático da disciplina de Estruturas de Dados."],
    ["an English course phrase", "This is my final class project for CS101."],
    ["two academic words", "Developed during the 5th semester at the university."],
    ["accent-free Portuguese", "Lista de exercicios de algoritmos."],
  ])("classifies a README with %s as learning", (_label, readme) => {
    const result = classify({ readme });
    expect(result.purpose).toBe("learning");
    expect(result.maturityExpectation).toBe("low");
  });

  it.each(["tp1-grafos", "aula-03-react", "Lista2", "homework-week3", "ed-trabalho-final"])(
    "classifies repo name %s as learning",
    (repoName) => {
      const result = classify({ repoUrl: `https://github.com/student/${repoName}` });
      expect(result.purpose).toBe("learning");
    }
  );

  it.each(["create-t3-app", "http-client", "laptop-store", "output-parser", "gitlab-sync"])(
    "does not classify repo name %s as learning",
    (repoName) => {
      const result = classify({ repoUrl: `https://github.com/acme/${repoName}` });
      expect(result.purpose).toBe("production");
    }
  );

  it("classifies numbered coursework folders as learning", () => {
    const result = classify({
      files: [
        { path: "aula-01/index.html", name: "index.html" },
        { path: "aula-02/index.html", name: "index.html" },
      ],
    });
    expect(result.purpose).toBe("learning");
  });

  it("does not classify ordinary folders that contain academic substrings", () => {
    const result = classify({
      files: [
        { path: "src/http/client.ts", name: "client.ts" },
        { path: "src/components/lista/ListaItem.tsx", name: "ListaItem.tsx" },
        { path: "src/output/writer.ts", name: "writer.ts" },
        { path: "src/approvals/prova.ts", name: "prova.ts" },
      ],
    });
    expect(result.purpose).toBe("production");
  });
});

describe("academic signal helpers", () => {
  it("treats a single ambiguous README word as a weak hint only", () => {
    expect(detectReadmeAcademicSignals("Built for a university.")).toEqual({
      isAcademic: false,
      matches: ["university"],
    });
  });

  it("matches repository name tokens exactly", () => {
    expect(isAcademicNameToken("tp1")).toBe(true);
    expect(isAcademicNameToken("t3")).toBe(false);
    expect(isAcademicNameToken("http")).toBe(false);
  });

  it("requires a number for ambiguous folder words", () => {
    expect(isAcademicFolderName("lista")).toBe(false);
    expect(isAcademicFolderName("lista-2")).toBe(true);
    expect(isAcademicFolderName("exercicios")).toBe(true);
    expect(isAcademicFolderName("Capitulo3")).toBe(true);
  });
});
