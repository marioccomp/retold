import { Client } from "minio";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET!;
export const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL!;
