/**
 * Per-user contribution metrics extracted from `git log`.
 *
 * Commits and line counts come from ONE log invocation so both always cover the
 * same commits: the default branch history, without merge commits (a merge would
 * otherwise re-count every line of the branch it brings in).
 */

const RECORD_SEPARATOR = "\x1e";
const FIELD_SEPARATOR = "\x1f";

export function buildContributionLogArgs(repoPath: string) {
  return [
    "-C",
    repoPath,
    "log",
    "HEAD",
    "--no-merges",
    "--numstat",
    // %aI = strict ISO author date, keeping the author's own UTC offset.
    "--format=%x1e%H%x1f%aE%x1f%aN%x1f%aI",
  ];
}

export type CommitAuthor = { email: string; name: string };

export type ContributionStats = {
  commitsCount: number;
  linesAdded: number;
  linesDeleted: number;
  /** Distinct "YYYY-MM-DD" days (author's local date) with at least one commit, sorted. */
  activeDates: string[];
  firstCommitDate: Date | null;
  lastCommitDate: Date | null;
};

const LOCKFILES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "poetry.lock",
  "pipfile.lock",
  "uv.lock",
  "composer.lock",
  "gemfile.lock",
  "go.sum",
  "packages.lock.json",
  "flake.lock",
  "mix.lock",
  "pubspec.lock",
  "podfile.lock",
]);

const GENERATED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".expo",
  "coverage",
  "vendor",
  "target",
  "pods",
  "__generated__",
  "generated",
]);

const GENERATED_SUFFIXES = [
  ".min.js",
  ".min.css",
  ".map",
  ".snap",
  ".pb.go",
  "_pb2.py",
  ".g.dart",
  ".designer.cs",
];

/** Resolves numstat rename notation ("src/{a => b}/x.ts", "a.ts => b.ts") to the new path. */
export function resolveNumstatPath(rawPath: string) {
  let resolved = rawPath.replace(/\{[^{}]*? => ([^{}]*)\}/g, "$1");
  if (resolved.includes(" => ")) {
    resolved = resolved.split(" => ").pop() ?? resolved;
  }
  return resolved.replace(/\/{2,}/g, "/");
}

/** Lockfiles, build output, vendored and generated files don't represent authored work. */
export function isExcludedFromLineCounts(rawPath: string) {
  const filePath = resolveNumstatPath(rawPath).toLowerCase();
  const segments = filePath.split("/");
  const fileName = segments[segments.length - 1] ?? "";

  if (LOCKFILES.has(fileName)) return true;
  if (segments.slice(0, -1).some((segment) => GENERATED_DIRS.has(segment))) return true;
  return GENERATED_SUFFIXES.some((suffix) => fileName.endsWith(suffix));
}

type MutableStats = {
  commitsCount: number;
  linesAdded: number;
  linesDeleted: number;
  activeDates: Set<string>;
  firstCommitDate: Date | null;
  lastCommitDate: Date | null;
};

function emptyStats(): MutableStats {
  return {
    commitsCount: 0,
    linesAdded: 0,
    linesDeleted: 0,
    activeDates: new Set(),
    firstCommitDate: null,
    lastCommitDate: null,
  };
}

function finalizeStats(stats: MutableStats): ContributionStats {
  return { ...stats, activeDates: [...stats.activeDates].sort() };
}

/**
 * Walks the log once and credits each commit to the key returned by
 * `attribute` (or to nobody when it returns null).
 */
function collectContributions<K>(
  output: string,
  attribute: (author: CommitAuthor) => K | null
): Map<K, MutableStats> {
  const byKey = new Map<K, MutableStats>();

  for (const record of output.split(RECORD_SEPARATOR)) {
    if (!record.trim()) continue;

    const [header, ...statLines] = record.split("\n");
    const [, email = "", name = "", authorDate = ""] = header.split(FIELD_SEPARATOR);

    const key = attribute({ email, name });
    if (key === null) continue;

    let stats = byKey.get(key);
    if (!stats) {
      stats = emptyStats();
      byKey.set(key, stats);
    }

    stats.commitsCount++;

    const date = new Date(authorDate);
    if (!Number.isNaN(date.getTime())) {
      // The first 10 chars of %aI are the date in the author's own timezone.
      stats.activeDates.add(authorDate.slice(0, 10));
      if (!stats.firstCommitDate || date < stats.firstCommitDate) stats.firstCommitDate = date;
      if (!stats.lastCommitDate || date > stats.lastCommitDate) stats.lastCommitDate = date;
    }

    for (const line of statLines) {
      const [added, deleted, ...pathParts] = line.split("\t");
      if (pathParts.length === 0) continue;
      if (isExcludedFromLineCounts(pathParts.join("\t"))) continue;

      // Binary files are reported as "-\t-\tpath".
      const addedCount = Number.parseInt(added, 10);
      const deletedCount = Number.parseInt(deleted, 10);
      if (!Number.isNaN(addedCount)) stats.linesAdded += addedCount;
      if (!Number.isNaN(deletedCount)) stats.linesDeleted += deletedCount;
    }
  }

  return byKey;
}

export function parseContributionLog(
  output: string,
  isUserCommit: (author: CommitAuthor) => boolean
): ContributionStats {
  const stats = collectContributions(output, (author) => (isUserCommit(author) ? true : null));
  return finalizeStats(stats.get(true) ?? emptyStats());
}

/** Commit identity of one project member (lowercased emails and names). */
export type ContributionMember<Id> = {
  id: Id;
  emails: string[];
  names: string[];
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Decides which member authored a commit, crediting at most one member:
 * an exact email match wins; otherwise a name match counts only when it points
 * to a single member. Ambiguous commits are credited to nobody, so two members
 * with similar identities never both get credit for the same work.
 */
export function attributeCommitAuthor<Id>(
  author: CommitAuthor,
  members: ContributionMember<Id>[]
): Id | null {
  const email = normalizeEmail(author.email);
  const byEmail = email ? members.filter((m) => m.emails.includes(email)) : [];
  if (byEmail.length === 1) return byEmail[0].id;
  if (byEmail.length > 1) return null;

  const name = normalizeName(author.name);
  const byName = name ? members.filter((m) => m.names.includes(name)) : [];
  return byName.length === 1 ? byName[0].id : null;
}

/** Contribution stats for every member of a team project, from a single log. */
export function parseTeamContributionLog<Id>(
  output: string,
  members: ContributionMember<Id>[]
): Map<Id, ContributionStats> {
  const collected = collectContributions(output, (author) =>
    attributeCommitAuthor(author, members)
  );

  return new Map(
    members.map((member) => [member.id, finalizeStats(collected.get(member.id) ?? emptyStats())])
  );
}
