import fs from "fs";
import path from "path";
import { FileEntry } from "./scan-repository.js";

export function detectStack(files: FileEntry[], languages: string[]) {
  const stack = {
    languages: [...languages],
    frameworks: [] as string[],
    tools: [] as string[],
  };

  const hasFile = (name: string) => files.some((f) => f.name === name);

  if (hasFile("package.json")) {
    const pkgPath = files.find((f) => f.name === "package.json")!.path;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (deps.typescript) stack.languages.push("TypeScript");
    if (deps.react) stack.frameworks.push("React");
    if (deps.next) stack.frameworks.push("Next.js");
    if (deps.express) stack.frameworks.push("Express");
    if (deps["@nestjs/core"]) stack.frameworks.push("NestJS");

    if (deps.prisma) stack.tools.push("Prisma");
    if (deps.tailwindcss) stack.tools.push("Tailwind");
  }

  if (hasFile("requirements.txt") || hasFile("pyproject.toml")) {
    stack.languages.push("Python");
  }

  if (hasFile("go.mod")) {
    stack.languages.push("Go");
  }

  if (hasFile("pom.xml")) {
    stack.languages.push("Java");
  }

  stack.languages = [...new Set(stack.languages)];

  return stack;
}
