import { describe, expect, it } from "vitest";
import {
  matchesUserCommitAuthor,
  resolveUserCommitIdentity,
} from "@repo/database";

describe("user commit identity", () => {
  it("matches commits authored with the linked GitHub email or noreply aliases", () => {
    const identity = resolveUserCommitIdentity({
      email: "manual-account@example.com",
      githubEmail: "real-github@example.com",
      username: "retoldUser",
      name: "Mario Campos",
      githubUrl: "https://github.com/marioccomp",
      githubAccountId: "987654",
    });

    expect(identity.preferredGithubHandle).toBe("marioccomp");

    expect(
      matchesUserCommitAuthor(
        {
          email: "real-github@example.com",
          name: "Mario Campos",
        },
        identity
      )
    ).toBe(true);

    expect(
      matchesUserCommitAuthor(
        {
          email: "987654+marioccomp@users.noreply.github.com",
          name: "Mario Campos",
        },
        identity
      )
    ).toBe(true);

    expect(
      matchesUserCommitAuthor(
        {
          email: "marioccomp@users.noreply.github.com",
          name: "Another Name",
        },
        identity
      )
    ).toBe(true);
  });

  it("falls back to exact names and usernames without broad partial matches", () => {
    const identity = resolveUserCommitIdentity({
      email: "manual-account@example.com",
      username: "retoldUser",
      name: "Mario Campos",
    });

    expect(
      matchesUserCommitAuthor(
        {
          email: "someone-else@example.com",
          name: "Mario Campos",
        },
        identity
      )
    ).toBe(true);

    expect(
      matchesUserCommitAuthor(
        {
          email: "retolduser123@example.com",
          name: "Another Name",
        },
        identity
      )
    ).toBe(false);
  });
});
