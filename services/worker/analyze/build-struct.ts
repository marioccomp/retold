// worker/analyze/build-struct.ts
import { FileEntry } from "./scan-repository.js";

export function buildStructure(files: FileEntry[]) {
  const topLevelDirs = new Set<string>();
  const secondLevelDirs = new Set<string>();
  const thirdLevelDirs = new Set<string>();
  const fourthLevelDirs = new Set<string>();
  const fifthLevelDirs = new Set<string>();
  const sixthLevelDirs = new Set<string>();

  const ignored = ["node_modules", ".git", "dist", "build", ".next", "out", "target", "vendor"];

  let packageJsonCount = 0;
  let hasAppsDir = false;
  let hasPackagesDir = false;

  for (const f of files) {
    const rel = f.relativePath.split("/");
    const top = rel[0];
    if (top && top !== "." && !top.includes(".") && !ignored.includes(top)) topLevelDirs.add(top);
    let second;
    let third;
    let fourth;
    let fifth;
    let sixth;
    if (rel.length >= 2) {
      second = rel[1];
      if (second && !second.includes(".")) {
        secondLevelDirs.add(`${top}/${second}`);
      }
    }

    if (rel.length >= 3) {
      third = rel[2];
      if (third && !third.includes(".")) {
        thirdLevelDirs.add(`${top}/${second}/${third}`);
      }
    }

    if (rel.length >= 4) {
      fourth = rel[3];
      if (fourth && !fourth.includes(".")) {
        fourthLevelDirs.add(`${top}/${second}/${third}/${fourth}`);
      }
    }

    if (rel.length >= 5) {
      fifth = rel[4];
      if (fifth && !fifth.includes(".")) {
        fifthLevelDirs.add(`${top}/${second}/${third}/${fourth}/${fifth}`);
      }
    }

    if (rel.length >= 6) {
      sixth = rel[5];
      if (sixth && !sixth.includes(".")) {
        sixthLevelDirs.add(`${top}/${second}/${third}/${fourth}/${fifth}/${sixth}`);
      }
    }

    if (f.name === "package.json") packageJsonCount++;

    if (top === "apps") hasAppsDir = true;
    if (top === "packages") hasPackagesDir = true;
  }

  return {
    topLevelDirs: [...topLevelDirs].slice(0, 20),
    secondLevelDirs: [...secondLevelDirs].sort().slice(0, 40),
    thirdLevelDirs: [...thirdLevelDirs].sort().slice(0, 40),
    fourthLevelDirs: [...fourthLevelDirs].sort().slice(0, 40),
    fifthLevelDirs: [...fifthLevelDirs].sort().slice(0, 40),
    sixthLevelDirs: [...sixthLevelDirs].sort().slice(0, 40),
    packageJsonCount,
    hasAppsDir,
    hasPackagesDir,
  };
}
