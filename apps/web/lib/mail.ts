import { Resend } from "resend";
import { createLogger } from "@repo/observability";

const resend = new Resend(process.env.RESEND_API_KEY);
const logger = createLogger("web.mail");

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  try {
    await resend.emails.send({
      from: "Retold <noreply@retold.com.br>",
      to: email,
      subject: "Redefinição de senha - Retold",
      html: `<p>Você solicitou a alteração de senha. Clique <a href="${resetUrl}">aqui</a> para prosseguir.</p>`,
    });
  } catch (error) {
    logger.error("mail.password_reset_send_failed", error, {
      hasRecipient: Boolean(email),
    });
  }
}
