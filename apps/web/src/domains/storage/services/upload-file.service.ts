import "server-only";

import sharp from "sharp";
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@repo/storage";
import { randomUUID } from "crypto";

type UploadFilesParams = {
  file: File;
  folder: "avatars" | "projects";
};

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; //10MB PODE SER ALTERADO FUTURAMENTE (PESQUISAR SOBRE)

export async function uploadFileService({ file, folder }: UploadFilesParams): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error("Invalid file.");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Image type not allowed. Use JPG/PNG/WebP/AVIF.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Image too large. Maximum allowed: 10MB.");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let outputBuffer: Buffer;

  if (folder === "avatars") {
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(512, 512, { fit: "cover", position: "center" }) // avatar quadrado
      .webp({ quality: 80 })
      .toBuffer();
  } else {
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 1600,
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: 80 })
      .toBuffer();
  }

  const objectName = `${folder}/${randomUUID()}.webp`;

  await minioClient.putObject(MINIO_BUCKET, objectName, outputBuffer, outputBuffer.length, {
    "Content-Type": "image/webp",
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${objectName}`;
}
