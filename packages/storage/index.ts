import { Client } from "minio";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  ...(process.env.MINIO_PORT && { port: Number(process.env.MINIO_PORT) }),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
  region: process.env.MINIO_REGION || "auto",
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET!;
export const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL!;
