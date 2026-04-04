import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  try {
    await resend.emails.send({
      from: "Retold <noreply@retold.com.br>",
      to: email,
      subject: "Redefinição de senha - Retold",
      html: `<p>Você solicitou a alteração de senha. Clique <a href="${resetUrl}">aqui</a> para prosseguir.</p>`,
    });
  } catch (error) {
    console.error("Erro no serviço de email: ", error);
  }
}
