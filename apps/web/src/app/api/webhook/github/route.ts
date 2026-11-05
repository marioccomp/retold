import { NextResponse } from "next/server";
import crypto from "crypto";
import { handlePushEvent } from "@/src/domains/github/push-webhook.service";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.api.github-webhook");

/**
 * Valida a assinatura HMAC-SHA256 enviada pelo GitHub.
 * Usa crypto.timingSafeEqual para prevenir timing attacks.
 */
function isSignatureValid(signature: string | null, body: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!signature || !secret) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(body).digest("hex")}`;

  // timingSafeEqual precisa de buffers de mesmo tamanho
  if (Buffer.byteLength(signature) !== Buffer.byteLength(digest)) return false;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const deliveryId = req.headers.get("x-github-delivery");
  const event = req.headers.get("x-github-event");

  if (!isSignatureValid(signature, rawBody)) {
    logger.warn("webhook.signature_invalid", {
      deliveryId,
      event,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ping event — GitHub envia ao cadastrar o webhook
  if (event === "ping") {
    logger.info("webhook.ping_received", { deliveryId });
    return NextResponse.json({ message: "pong" }, { status: 200 });
  }

  // Push event — nosso foco principal
  if (event === "push") {
    try {
      const payload = JSON.parse(rawBody);

      logger.info("webhook.push_received", {
        deliveryId,
        repositoryId: payload.repository?.id ?? null,
        installationId: payload.installation?.id ?? null,
        commitCount: payload.commits?.length ?? 0,
        ref: payload.ref ?? null,
      });

      const result = await handlePushEvent(payload);

      if (!result.processed) {
        logger.info("webhook.push_ignored", {
          deliveryId,
          repositoryId: payload.repository?.id ?? null,
          installationId: payload.installation?.id ?? null,
          reason: result.reason,
        });
      } else {
        logger.info("webhook.push_processed", {
          deliveryId,
          repositoryId: payload.repository?.id ?? null,
          installationId: payload.installation?.id ?? null,
          scheduledProjectCount: result.projectIds.length,
          linkedUserCount: result.userIds.length,
          commitCount: payload.commits?.length ?? 0,
        });
      }

      return NextResponse.json({ success: true, processed: result.processed }, { status: 200 });
    } catch (error) {
      logger.error("webhook.push_processing_failed", error, {
        deliveryId,
        event,
      });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }

  // Qualquer outro evento — aceitar sem processar (evitar reenvios do GitHub)
  logger.info("webhook.event_ignored", {
    deliveryId,
    event,
  });
  return NextResponse.json({ message: "Event ignored" }, { status: 200 });
}
