type UserCommitIdentityInput = {
  email: string;
  githubEmail?: string | null;
  username?: string | null;
  name?: string | null;
  githubUrl?: string | null;
  githubLogin?: string | null;
  githubAccountId?: string | null;
};

type CommitAuthorInput = {
  email?: string | null;
  name?: string | null;
  username?: string | null;
};

export type ResolvedUserCommitIdentity = {
  candidateEmails: string[];
  candidateNames: string[];
  preferredGithubHandle: string | null;
};

function normalizeToken(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function normalizeName(value?: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") || null;
}

function addToken(set: Set<string>, value?: string | null) {
  const normalized = normalizeToken(value);
  if (normalized) {
    set.add(normalized);
  }
}

function addName(set: Set<string>, value?: string | null) {
  const normalized = normalizeName(value);
  if (normalized) {
    set.add(normalized);
  }
}

function extractLocalPart(email?: string | null) {
  const normalizedEmail = normalizeToken(email);
  if (!normalizedEmail) return null;

  const [localPart] = normalizedEmail.split("@");
  return localPart || null;
}

export function extractGithubHandleFromUrl(url?: string | null) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.toLowerCase().includes("github.com")) {
      return null;
    }

    const [firstSegment] = parsedUrl.pathname.split("/").filter(Boolean);
    return normalizeToken(firstSegment);
  } catch {
    const match = url.match(/github\.com\/([^/?#]+)/i);
    return normalizeToken(match?.[1] ?? null);
  }
}

export function resolveUserCommitIdentity(
  input: UserCommitIdentityInput
): ResolvedUserCommitIdentity {
  const candidateEmails = new Set<string>();
  const candidateNames = new Set<string>();

  addToken(candidateEmails, input.email);
  addToken(candidateEmails, input.githubEmail);

  addName(candidateNames, input.name);
  addName(candidateNames, input.username);
  addName(candidateNames, extractLocalPart(input.email));
  addName(candidateNames, extractLocalPart(input.githubEmail));

  const preferredGithubHandle =
    extractGithubHandleFromUrl(input.githubUrl) ??
    normalizeToken(input.githubLogin) ??
    normalizeToken(input.username) ??
    extractLocalPart(input.githubEmail) ??
    extractLocalPart(input.email);

  if (preferredGithubHandle) {
    addName(candidateNames, preferredGithubHandle);
    addToken(candidateEmails, `${preferredGithubHandle}@users.noreply.github.com`);

    const normalizedGithubAccountId = normalizeToken(input.githubAccountId);
    if (normalizedGithubAccountId) {
      addToken(
        candidateEmails,
        `${normalizedGithubAccountId}+${preferredGithubHandle}@users.noreply.github.com`
      );
    }
  }

  return {
    candidateEmails: Array.from(candidateEmails),
    candidateNames: Array.from(candidateNames),
    preferredGithubHandle,
  };
}

export function matchesUserCommitAuthor(
  author: CommitAuthorInput,
  identity: ResolvedUserCommitIdentity
) {
  const authorEmail = normalizeToken(author.email);
  if (authorEmail && identity.candidateEmails.includes(authorEmail)) {
    return true;
  }

  const authorName = normalizeName(author.name);
  if (authorName && identity.candidateNames.includes(authorName)) {
    return true;
  }

  const authorUsername = normalizeToken(author.username);
  if (authorUsername && identity.candidateNames.includes(authorUsername)) {
    return true;
  }

  return false;
}
