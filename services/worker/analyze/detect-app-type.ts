export function detectAppType(stack: { frameworks: string[]; tools: string[] }) {
  let frontendScore = 0;
  let backendScore = 0;

  if (stack.frameworks.some((f) => ["React", "Next.js", "Vue", "Svelte"].includes(f))) {
    frontendScore += 2;
  }

  if (stack.frameworks.some((f) => ["Express", "NestJS"].includes(f))) {
    backendScore += 2;
  }

  if (stack.tools.includes("Prisma")) backendScore += 2;

  if (frontendScore > 0 && backendScore > 0) return "fullstack";
  if (frontendScore > backendScore) return "frontend";
  if (backendScore > frontendScore) return "backend";

  return "unknown";
}
