import { z } from "zod";

export const getResetPasswordSchema = (dict: any) => z.object({
  token: z.string().min(1, dict.validation.fields_invalid), // Generic error if token missing
  password: z.string().min(6, dict.validation.password_min),
});
