import "server-only";

import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@repo/storage";

export async function deleteFileByUrlService(fileUrl: string) {
    if (!fileUrl) {
        return;
    }

    const isLocalhost = MINIO_PUBLIC_URL.includes("localhost") || MINIO_PUBLIC_URL.includes("127.0.0.1");
    const expectdPrefix = isLocalhost ? `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}` : MINIO_PUBLIC_URL;

    if (!fileUrl.startsWith(expectdPrefix)) {
        return;
    }

    const objectName = fileUrl.replace(`${expectdPrefix}/`, "");

    try {
        await minioClient.removeObject(MINIO_BUCKET, objectName);
    } catch (err) {
        console.error("Failed to delete file from MinIO:", err);
    }
}