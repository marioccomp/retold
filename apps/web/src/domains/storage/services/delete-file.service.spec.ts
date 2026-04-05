import { beforeEach, describe, expect, it, vi } from "vitest";

const { removeObject, loggerError } = vi.hoisted(() => ({
  removeObject: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@repo/storage", () => ({
  minioClient: {
    removeObject,
  },
  MINIO_BUCKET: "retold-bucket",
  MINIO_PUBLIC_URL: "http://localhost:9000",
}));

vi.mock("@repo/observability", () => ({
  createLogger: () => ({
    error: loggerError,
  }),
}));

import { deleteFileByUrlService } from "./delete-file.service";

describe("deleteFileByUrlService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should ignore empty or external urls", async () => {
    await deleteFileByUrlService("");
    await deleteFileByUrlService("https://example.com/image.webp");

    expect(removeObject).not.toHaveBeenCalled();
  });

  it("should delete files that belong to the configured bucket", async () => {
    await deleteFileByUrlService(
      "http://localhost:9000/retold-bucket/users/2/avatar/current-avatar.webp"
    );

    expect(removeObject).toHaveBeenCalledWith(
      "retold-bucket",
      "users/2/avatar/current-avatar.webp"
    );
  });

  it("should swallow storage errors and log them", async () => {
    removeObject.mockRejectedValue(new Error("storage unavailable"));

    await expect(
      deleteFileByUrlService("http://localhost:9000/retold-bucket/users/2/avatar/a.webp")
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith(
      "storage.object_delete_failed",
      expect.any(Error),
      expect.objectContaining({
        bucket: "retold-bucket",
        hasObjectName: true,
      })
    );
  });
});
