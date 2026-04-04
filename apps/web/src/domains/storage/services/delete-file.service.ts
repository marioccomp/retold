import "server-only";

import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@repo/storage";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.storage.delete-file");

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
        logger.error("storage.object_delete_failed", err, {
            bucket: MINIO_BUCKET,
            hasObjectName: Boolean(objectName),
        });
    }
}
