import { NextResponse } from "next/server";
import crypto from "crypto";
import { webhookRepository } from "@repo/database";

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

  if (!isSignatureValid(signature, rawBody)) {
    console.warn("[Webhook] Assinatura inválida — request rejeitado");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");

  // Ping event — GitHub envia ao cadastrar o webhook
  if (event === "ping") {
    console.log("[Webhook] Ping recebido com sucesso ✓");
    return NextResponse.json({ message: "pong" }, { status: 200 });
  }

  // Push event — nosso foco principal
  if (event === "push") {
    try {
      const payload = JSON.parse(rawBody);

      console.log(
        `[Webhook] Push recebido: ${payload.repository?.full_name} por ${payload.sender?.login} (${payload.commits?.length || 0} commits)`
      );

      const result = await webhookRepository.processPushEvent(payload);

      if (!result.processed) {
        console.log(`[Webhook] Push ignorado: ${result.reason}`);
      } else {
        console.log(`[Webhook] Push processado com sucesso para userId=${result.userId}`);
      }

      return NextResponse.json({ success: true, processed: result.processed }, { status: 200 });
    } catch (error) {
      console.error("[Webhook] Erro ao processar push:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }

  // Qualquer outro evento — aceitar sem processar (evitar reenvios do GitHub)
  console.log(`[Webhook] Evento ignorado: ${event}`);
  return NextResponse.json({ message: "Event ignored" }, { status: 200 });
}
