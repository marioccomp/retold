import { describe, expect, it } from "vitest";
import {
  assertPathInsideBase,
  isPathInsideBase,
  parsePositiveSafeInteger,
  validateGitHubRepositoryUrl,
} from "../../../../services/worker/security";

describe("worker security helpers", () => {
  it("should validate GitHub repository URLs and normalize .git suffixes", () => {
    expect(validateGitHubRepositoryUrl("https://github.com/openai/codex.git")).toEqual({
      owner: "openai",
      repo: "codex",
      normalizedUrl: "https://github.com/openai/codex",
    });
  });

  it("should reject non-https or non-github repository URLs", () => {
    expect(() => validateGitHubRepositoryUrl("http://github.com/openai/codex")).toThrow(
      "Repository URL must use https"
    );
    expect(() => validateGitHubRepositoryUrl("https://gitlab.com/openai/codex")).toThrow(
      "Repository URL host is not allowed"
    );
  });

  it("should check whether paths stay inside the expected base directory", () => {
    expect(isPathInsideBase("C:\\temp\\retold\\1", "C:\\temp\\retold")).toBe(true);
    expect(isPathInsideBase("C:\\temp\\retold\\nested\\file.txt", "C:\\temp\\retold")).toBe(true);
    expect(isPathInsideBase("C:\\temp\\other\\file.txt", "C:\\temp\\retold")).toBe(false);
  });

  it("should throw when a path escapes the allowed base", () => {
    expect(() =>
      assertPathInsideBase("C:\\temp\\other\\file.txt", "C:\\temp\\retold", "Temporary path")
    ).toThrow("Temporary path escapes the allowed base directory");
  });

  it("should parse only positive safe integers", () => {
    expect(parsePositiveSafeInteger(15, "projectId")).toBe(15);
    expect(parsePositiveSafeInteger("42", "projectId")).toBe(42);

    expect(() => parsePositiveSafeInteger(0, "projectId")).toThrow(
      "Invalid projectId in worker job payload"
    );
    expect(() => parsePositiveSafeInteger("-1", "projectId")).toThrow(
      "Invalid projectId in worker job payload"
    );
    expect(() => parsePositiveSafeInteger("abc", "projectId")).toThrow(
      "Invalid projectId in worker job payload"
    );
  });
});
