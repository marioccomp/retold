import { z } from "zod";

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});
