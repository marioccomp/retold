import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import {
  attributeCommitAuthor,
  buildContributionLogArgs,
  isExcludedFromLineCounts,
  parseContributionLog,
  parseTeamContributionLog,
  resolveNumstatPath,
} from "../../../../services/worker/contribution-stats";
import { countDistinctActiveDays } from "@/src/domains/user/mappers/user-to-public-profile.mapper";

const isMario = (author: { email: string }) => author.email === "mario@example.com";

describe("parseContributionLog", () => {
  const log = [
    "\x1eaaa\x1fmario@example.com\x1fMario\x1f2026-01-10T23:30:00-03:00",
    "",
    "10\t2\tsrc/index.ts",
    "500\t0\tpnpm-lock.yaml",
    "-\t-\tassets/logo.png",
    "\x1ebbb\x1flucas@example.com\x1fLucas\x1f2026-01-11T10:00:00-03:00",
    "",
    "99\t99\tsrc/other.ts",
    "\x1eccc\x1fmario@example.com\x1fMario\x1f2026-01-12T09:00:00-03:00",
    "",
    "3\t1\tsrc/{old => new}/file.ts",
    "1000\t0\tdist/bundle.min.js",
    "",
  ].join("\n");

  it("counts only the user's commits and authored lines", () => {
    const stats = parseContributionLog(log, isMario);

    expect(stats.commitsCount).toBe(2);
    expect(stats.linesAdded).toBe(13);
    expect(stats.linesDeleted).toBe(3);
  });

  it("uses the author's local date for active days", () => {
    // 23:30 in UTC-3 is already the next day in UTC; it must stay on the 10th.
    const stats = parseContributionLog(log, isMario);
    expect(stats.activeDates).toEqual(["2026-01-10", "2026-01-12"]);
    expect(stats.firstCommitDate?.toISOString()).toBe("2026-01-11T02:30:00.000Z");
    expect(stats.lastCommitDate?.toISOString()).toBe("2026-01-12T12:00:00.000Z");
  });

  it("returns zeros when the user has no commits", () => {
    expect(parseContributionLog(log, () => false)).toEqual({
      commitsCount: 0,
      linesAdded: 0,
      linesDeleted: 0,
      activeDates: [],
      firstCommitDate: null,
      lastCommitDate: null,
    });
  });
});

describe("line count exclusions", () => {
  it.each([
    "pnpm-lock.yaml",
    "apps/web/package-lock.json",
    "go.sum",
    "node_modules/react/index.js",
    "packages/ui/dist/index.js",
    "public/app.min.js",
    "src/__generated__/graphql.ts",
    "src/__snapshots__/Button.test.tsx.snap",
  ])("excludes %s", (filePath) => {
    expect(isExcludedFromLineCounts(filePath)).toBe(true);
  });

  it.each(["src/index.ts", "src/build-query.ts", "docs/distribution.md", "prisma/migrations/1/migration.sql"])(
    "keeps %s",
    (filePath) => {
      expect(isExcludedFromLineCounts(filePath)).toBe(false);
    }
  );

  it("resolves rename notation to the destination path", () => {
    expect(resolveNumstatPath("src/{old => new}/file.ts")).toBe("src/new/file.ts");
    expect(resolveNumstatPath("src/{ => nested}/file.ts")).toBe("src/nested/file.ts");
    expect(resolveNumstatPath("a.ts => dist/a.js")).toBe("dist/a.js");
  });
});

describe("countDistinctActiveDays", () => {
  it("counts a day shared by two projects once", () => {
    expect(
      countDistinctActiveDays([
        { activeDates: ["2026-01-10", "2026-01-11"], activeDays: 2 },
        { activeDates: ["2026-01-11", "2026-01-12"], activeDays: 2 },
      ])
    ).toBe(3);
  });

  it("falls back to the stored count for rows without dates", () => {
    expect(
      countDistinctActiveDays([
        { activeDates: ["2026-01-10"], activeDays: 1 },
        { activeDates: [], activeDays: 4 },
      ])
    ).toBe(5);
  });
});

describe("contribution stats on a real git repository", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  // An empty global config isolates the test from the developer's git settings.
  // (os.devNull can't be used: git rejects "\\.\nul" on Windows.)
  let emptyGitConfig = "";

  function git(repo: string, args: string[], author?: { name: string; email: string; date: string }) {
    execFileSync("git", ["-C", repo, ...args], {
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: emptyGitConfig,
        GIT_AUTHOR_NAME: author?.name ?? "Setup",
        GIT_AUTHOR_EMAIL: author?.email ?? "setup@example.com",
        GIT_AUTHOR_DATE: author?.date ?? "2026-01-01T12:00:00-03:00",
        GIT_COMMITTER_NAME: author?.name ?? "Setup",
        GIT_COMMITTER_EMAIL: author?.email ?? "setup@example.com",
        GIT_COMMITTER_DATE: author?.date ?? "2026-01-01T12:00:00-03:00",
      },
      stdio: "pipe",
    });
  }

  function write(repo: string, file: string, lines: number) {
    const full = path.join(repo, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Array.from({ length: lines }, (_, i) => `line ${i}`).join("\n") + "\n");
  }

  it("ignores merge commits, lockfiles and other authors", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "retold-contrib-"));
    tempDirs.push(repo);
    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "retold-gitconfig-"));
    tempDirs.push(configDir);
    emptyGitConfig = path.join(configDir, "gitconfig");
    fs.writeFileSync(emptyGitConfig, "");

    const mario = { name: "Mario", email: "mario@example.com" };
    const lucas = { name: "Lucas", email: "lucas@example.com" };

    git(repo, ["init", "-q", "-b", "main"]);

    write(repo, "src/app.ts", 10);
    write(repo, "pnpm-lock.yaml", 300);
    git(repo, ["add", "."]);
    git(repo, ["commit", "-q", "-m", "init"], { ...mario, date: "2026-01-10T10:00:00-03:00" });

    git(repo, ["checkout", "-q", "-b", "feature"]);
    write(repo, "src/feature.ts", 5);
    git(repo, ["add", "."]);
    git(repo, ["commit", "-q", "-m", "feature"], { ...mario, date: "2026-01-11T10:00:00-03:00" });

    git(repo, ["checkout", "-q", "main"]);
    write(repo, "src/lucas.ts", 50);
    git(repo, ["add", "."]);
    git(repo, ["commit", "-q", "-m", "lucas"], { ...lucas, date: "2026-01-11T11:00:00-03:00" });

    // A merge commit authored by Mario must not re-count the feature branch lines.
    git(repo, ["merge", "-q", "--no-ff", "feature", "-m", "merge"], {
      ...mario,
      date: "2026-01-12T10:00:00-03:00",
    });

    const output = execFileSync("git", buildContributionLogArgs(repo), { encoding: "utf8" });
    const stats = parseContributionLog(output, isMario);

    expect(stats.commitsCount).toBe(2);
    expect(stats.linesAdded).toBe(15);
    expect(stats.linesDeleted).toBe(0);
    expect(stats.activeDates).toEqual(["2026-01-10", "2026-01-11"]);
  });
});

describe("team attribution", () => {
  const mario = { id: 1, emails: ["mario@example.com"], names: ["mario", "marioccomp"] };
  const lucas = { id: 2, emails: ["lucas@example.com"], names: ["lucas", "lucassantiago"] };

  it("credits each commit to the member it belongs to", () => {
    expect(attributeCommitAuthor({ email: "MARIO@example.com", name: "x" }, [mario, lucas])).toBe(1);
    expect(attributeCommitAuthor({ email: "other@example.com", name: "Lucas" }, [mario, lucas])).toBe(2);
    expect(attributeCommitAuthor({ email: "other@example.com", name: "Someone" }, [mario, lucas])).toBeNull();
  });

  it("prefers an exact email over a name shared with another member", () => {
    const lucasNamedMario = { ...lucas, names: [...lucas.names, "mario"] };
    expect(
      attributeCommitAuthor({ email: "lucas@example.com", name: "mario" }, [mario, lucasNamedMario])
    ).toBe(2);
  });

  it("credits nobody when a name matches more than one member", () => {
    const twoMarios = [mario, { id: 3, emails: ["m2@example.com"], names: ["mario"] }];
    expect(attributeCommitAuthor({ email: "unknown@example.com", name: "Mario" }, twoMarios)).toBeNull();
  });

  it("computes separate stats for every member from one log", () => {
    const log = [
      "\x1eaaa\x1fmario@example.com\x1fMario\x1f2026-01-10T10:00:00-03:00",
      "",
      "10\t0\tsrc/a.ts",
      "\x1ebbb\x1flucas@example.com\x1fLucas\x1f2026-01-10T11:00:00-03:00",
      "",
      "4\t1\tsrc/b.ts",
      "\x1eccc\x1fbot@example.com\x1fdependabot\x1f2026-01-11T11:00:00-03:00",
      "",
      "999\t0\tsrc/c.ts",
      "",
    ].join("\n");

    const stats = parseTeamContributionLog(log, [mario, lucas, { id: 4, emails: [], names: [] }]);

    expect(stats.get(1)).toMatchObject({ commitsCount: 1, linesAdded: 10, linesDeleted: 0 });
    expect(stats.get(2)).toMatchObject({ commitsCount: 1, linesAdded: 4, linesDeleted: 1 });
    // A member without commits still gets a (zeroed) entry, so stale stats are overwritten.
    expect(stats.get(4)).toMatchObject({ commitsCount: 0, linesAdded: 0, activeDates: [] });
  });
});
