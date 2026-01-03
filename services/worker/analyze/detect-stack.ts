import fs from "fs";
import path from "path";

export function detectStack(basePath: string) {
  const stack = {
    languages: [] as string[],
    frameworks: [] as string[],
    tools: [] as string[],
  };

  const pkgPath = path.join(basePath, "package.json");

  if (!fs.existsSync(pkgPath)) return stack;

  stack.languages.push("JavaScript");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  if (deps.typescript) stack.languages.push("TypeScript");

  if (deps.react) stack.frameworks.push("React");
  if (deps.next) stack.frameworks.push("Next.js");
  if (deps.vue) stack.frameworks.push("Vue");
  if (deps.svelte) stack.frameworks.push("Svelte");

  if (deps.express) stack.frameworks.push("Express");
  if (deps["@nestjs/core"]) stack.frameworks.push("NestJS");

  if (deps.tailwindcss) stack.tools.push("Tailwind");
  if (deps.prisma) stack.tools.push("Prisma");

  return stack;
}
