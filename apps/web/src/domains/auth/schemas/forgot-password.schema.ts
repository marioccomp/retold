import { z } from "zod";

export const getForgotPasswordSchema = (dict: any) => z.object({
  email: z.string().email(dict.validation.email_invalid),
});
