import { beforeEach, describe, expect, it, vi } from "vitest";

const { putObject, sharpMock } = vi.hoisted(() => ({
  putObject: vi.fn(),
  sharpMock: vi.fn(),
}));

vi.mock("@repo/storage", () => ({
  minioClient: {
    putObject,
  },
  MINIO_BUCKET: "retold-bucket",
  MINIO_PUBLIC_URL: "http://localhost:9000",
}));

vi.mock("sharp", () => ({
  default: sharpMock,
}));

import { uploadFileService } from "./upload-file.service";

describe("uploadFileService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    sharpMock.mockImplementation(() => ({
      rotate: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      webp: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed-image")),
    }));
  });

  it("should reject invalid or empty files", async () => {
    const emptyFile = new File([], "avatar.png", { type: "image/png" });

    await expect(
      uploadFileService({
        file: emptyFile,
        folder: "avatars",
        userId: 1,
      })
    ).rejects.toThrow("Invalid file.");
  });

  it("should reject unsupported mime types and oversized files", async () => {
    const invalidType = new File([new Uint8Array([1, 2, 3])], "avatar.gif", { type: "image/gif" });
    await expect(
      uploadFileService({
        file: invalidType,
        folder: "avatars",
        userId: 1,
      })
    ).rejects.toThrow("Image type not allowed. Use JPG/PNG/WebP/AVIF.");

    const largeFile = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "cover.png", {
      type: "image/png",
    });
    await expect(
      uploadFileService({
        file: largeFile,
        folder: "covers",
        userId: 1,
      })
    ).rejects.toThrow("Image too large. Maximum allowed: 10MB.");
  });

  it("should upload avatars with the expected path and public url", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", { type: "image/png" });

    const url = await uploadFileService({
      file,
      folder: "avatars",
      userId: 12,
    });

    expect(putObject).toHaveBeenCalledWith(
      "retold-bucket",
      expect.stringMatching(/^users\/12\/avatar\/.+\.webp$/),
      expect.any(Buffer),
      expect.any(Number),
      expect.objectContaining({
        "Content-Type": "image/webp",
      })
    );
    expect(url).toMatch(/^http:\/\/localhost:9000\/retold-bucket\/users\/12\/avatar\/.+\.webp$/);
  });

  it("should require a projectId for project images", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "project.png", { type: "image/png" });

    await expect(
      uploadFileService({
        file,
        folder: "projects",
        userId: 12,
      })
    ).rejects.toThrow("projectId is required for project images");
  });

  it("should upload project images to the correct user/project scope", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "project.png", { type: "image/png" });

    const url = await uploadFileService({
      file,
      folder: "projects",
      userId: 9,
      projectId: 44,
    });

    expect(putObject).toHaveBeenCalledWith(
      "retold-bucket",
      expect.stringMatching(/^users\/9\/projects\/44\/.+\.webp$/),
      expect.any(Buffer),
      expect.any(Number),
      expect.any(Object)
    );
    expect(url).toMatch(/^http:\/\/localhost:9000\/retold-bucket\/users\/9\/projects\/44\/.+\.webp$/);
  });
});
